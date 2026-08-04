import { prisma } from "../../database/prisma.js";

import type {
  ProductsQuery
} from "../products/products.query.js";

import {
  getProducts
} from "../products/products.service.js";

type CategoryRecord = Awaited<
  ReturnType<typeof loadVisibleCategories>
>[number];

async function loadVisibleCategories() {
  return prisma.categories.findMany({
    where: {
      is_visible: true
    },
    orderBy: [
      { sort_order: "asc" },
      { name: "asc" }
    ]
  });
}

function collectDescendantIds(
  categoryId: string,
  childrenByParent: Map<string, string[]>
): string[] {
  const result = [categoryId];
  const children = childrenByParent.get(categoryId) ?? [];

  for (const childId of children) {
    result.push(
      ...collectDescendantIds(
        childId,
        childrenByParent
      )
    );
  }

  return result;
}

async function buildCategoryCatalog() {
  const categories = await loadVisibleCategories();

  const childrenByParent = new Map<string, string[]>();

  for (const category of categories) {
    if (!category.parent_category_id) {
      continue;
    }

    const children =
      childrenByParent.get(category.parent_category_id)
      ?? [];

    children.push(category.id);
    childrenByParent.set(
      category.parent_category_id,
      children
    );
  }

  const productLinks =
    await prisma.product_categories.findMany({
      where: {
        products: {
          is_active: true,
          product_variants: {
            some: {
              status: "active"
            }
          }
        }
      },
      select: {
        category_id: true,
        product_id: true
      }
    });

  const productsByCategory = new Map<string, Set<string>>();

  for (const link of productLinks) {
    const products =
      productsByCategory.get(link.category_id)
      ?? new Set<string>();

    products.add(link.product_id);
    productsByCategory.set(link.category_id, products);
  }

  const countProducts = (categoryId: string): number => {
    const productIds = new Set<string>();

    for (
      const descendantId
      of collectDescendantIds(
        categoryId,
        childrenByParent
      )
    ) {
      for (
        const productId
        of productsByCategory.get(descendantId) ?? []
      ) {
        productIds.add(productId);
      }
    }

    return productIds.size;
  };

  const decorate = (
    category: CategoryRecord
  ) => ({
    ...category,
    product_count: countProducts(category.id),
    other_categories: categories
      .filter(
        (item) =>
          item.parent_category_id === category.id
      )
      .map((child) => ({
        ...child,
        product_count: countProducts(child.id),
        other_categories: []
      }))
  });

  return {
    categories,
    childrenByParent,
    decorate
  };
}

export async function getCategories() {
  const catalog = await buildCategoryCatalog();

  return catalog.categories
    .filter(
      (category) =>
        category.parent_category_id === null
    )
    .map(catalog.decorate);
}

export async function getCategoryBySlug(
  slug: string
) {
  const catalog = await buildCategoryCatalog();

  const category = catalog.categories.find(
    (item) => item.slug === slug
  );

  return category
    ? catalog.decorate(category)
    : null;
}

export async function getCategoryProductsBySlug(
  slug: string,
  query: ProductsQuery
) {
  const category =
    await prisma.categories.findFirst({
      where: {
        slug,
        is_visible: true
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

  if (!category) {
    return null;
  }

  const visibleCategories = await loadVisibleCategories();
  const childrenByParent = new Map<string, string[]>();

  for (const item of visibleCategories) {
    if (!item.parent_category_id) {
      continue;
    }

    const children =
      childrenByParent.get(item.parent_category_id)
      ?? [];

    children.push(item.id);
    childrenByParent.set(item.parent_category_id, children);
  }

  const categoryIds = collectDescendantIds(
    category.id,
    childrenByParent
  );

  const products =
    await getProducts(
      query,
      {
        product_categories: {
          some: {
            category_id: {
              in: categoryIds
            }
          }
        }
      }
    );

  return {
    category,
    ...products
  };
}
