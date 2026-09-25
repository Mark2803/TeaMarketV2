import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  getAdminCategory,
  updateAdminCategory,
  type AdminCategoryListItem,
} from "../../shared/api/admin";

type Form = {
  name: string; slug: string; parentCategoryId: string; description: string; imageUrl: string;
  sortOrder: string; isVisible: boolean; seoTitle: string; seoDescription: string;
  canonicalUrl: string; isIndexed: boolean;
};

const emptyForm: Form = {
  name: "", slug: "", parentCategoryId: "", description: "", imageUrl: "", sortOrder: "0",
  isVisible: true, seoTitle: "", seoDescription: "", canonicalUrl: "", isIndexed: true,
};

function transliterate(value: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",
    н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",
    ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  return value.toLowerCase().split("").map((c) => map[c] ?? c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
}

export default function AdminCategoryEditPage() {
  const { categoryId } = useParams();
  const isNew = !categoryId || categoryId === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(emptyForm);
  const [categories, setCategories] = useState<AdminCategoryListItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    getAdminCategories({ limit: 100 }).then((r) => setCategories(r.data)).catch(() => {});
    if (isNew || !categoryId) return;
    getAdminCategory(categoryId).then(({ data }) => {
      setForm({
        name: data.name, slug: data.slug, parentCategoryId: data.parentCategoryId ?? "",
        description: data.description ?? "", imageUrl: data.imageUrl ?? "", sortOrder: String(data.sortOrder),
        isVisible: data.isVisible, seoTitle: data.seoTitle ?? "", seoDescription: data.seoDescription ?? "",
        canonicalUrl: data.canonicalUrl ?? "", isIndexed: data.isIndexed,
      });
      setSlugTouched(true);
    }).catch(() => setError("Не удалось загрузить категорию.")).finally(() => setLoading(false));
  }, [categoryId, isNew]);

  const parentOptions = useMemo(() => categories.filter((x) => x.id !== categoryId), [categories, categoryId]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((old) => ({ ...old, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true); setError(""); setSuccess("");
    const input = {
      name: form.name.trim(), slug: form.slug.trim(), parentCategoryId: form.parentCategoryId || null,
      description: form.description.trim() || null, imageUrl: form.imageUrl.trim() || null,
      sortOrder: Number(form.sortOrder) || 0, isVisible: form.isVisible,
      seoTitle: form.seoTitle.trim() || null, seoDescription: form.seoDescription.trim() || null,
      canonicalUrl: form.canonicalUrl.trim() || null, isIndexed: form.isIndexed,
    };
    try {
      if (isNew) {
        const response = await createAdminCategory(input);
        navigate(`/admin/categories/${response.data.id}`, { replace: true });
      } else if (categoryId) {
        await updateAdminCategory(categoryId, input);
        setSuccess("Категория сохранена.");
      }
    } catch {
      setError("Не удалось сохранить категорию. Проверьте slug, URL изображения и введённые данные.");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!categoryId || isNew || deleting) return;
    if (!window.confirm(`Удалить категорию «${form.name}»?`)) return;
    setDeleting(true); setError("");
    try {
      await deleteAdminCategory(categoryId);
      navigate("/admin/categories", { replace: true });
    } catch {
      setError("Категорию нельзя удалить. Проверьте, нет ли в ней товаров или дочерних категорий.");
      setDeleting(false);
    }
  };

  if (loading) return <div className="admin-page"><p>Загрузка категории…</p></div>;

  return (
    <form className="admin-page admin-category-editor" onSubmit={save}>
      <Link className="admin-back-link" to="/admin/categories"><ArrowLeft size={17}/> К категориям</Link>
      <div className="admin-page-heading">
        <div><p className="admin-eyebrow">Каталог</p><h1>{isNew ? "Новая категория" : form.name || "Категория"}</h1><p>Основные данные, структура каталога, изображение и SEO.</p></div>
        <div className="admin-editor-top-actions">
          {!isNew && <button className="admin-danger-button" type="button" onClick={remove} disabled={deleting || saving}><Trash2 size={18}/>{deleting ? "Удаление…" : "Удалить"}</button>}
          <button className="admin-primary-button" type="submit" disabled={saving || deleting || !form.name.trim() || !form.slug.trim()}><Save size={18}/>{saving ? "Сохранение…" : "Сохранить"}</button>
        </div>
      </div>
      {error && <div className="admin-editor-message is-error">{error}</div>}
      {success && <div className="admin-editor-message is-success">{success}</div>}

      <section className="admin-editor-section">
        <h2>Основная информация</h2>
        <div className="admin-form-grid">
          <label className="admin-field"><span>Название *</span><input value={form.name} onChange={(e) => { const v=e.target.value; set("name",v); if(isNew && !slugTouched) set("slug",transliterate(v)); }}/></label>
          <label className="admin-field"><span>Slug *</span><input value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug",e.target.value); }}/></label>
          <label className="admin-field"><span>Родительская категория</span><select value={form.parentCategoryId} onChange={(e)=>set("parentCategoryId",e.target.value)}><option value="">Нет — корневая категория</option>{parentOptions.map((x)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="admin-field"><span>Порядок сортировки</span><input type="number" min="0" step="1" value={form.sortOrder} onChange={(e)=>set("sortOrder",e.target.value)}/></label>
          <label className="admin-field admin-field-wide"><span>Описание</span><textarea rows={5} value={form.description} onChange={(e)=>set("description",e.target.value)}/></label>
          <label className="admin-field admin-field-wide"><span>URL изображения</span><input value={form.imageUrl} onChange={(e)=>set("imageUrl",e.target.value)} placeholder="https://..."/></label>
        </div>
        {form.imageUrl && <div className="admin-category-preview"><img src={form.imageUrl} alt="Предпросмотр категории"/></div>}
        <div className="admin-checkbox-row">
          <label><input type="checkbox" checked={form.isVisible} onChange={(e)=>set("isVisible",e.target.checked)}/> Показывать категорию в магазине</label>
          <label><input type="checkbox" checked={form.isIndexed} onChange={(e)=>set("isIndexed",e.target.checked)}/> Разрешить индексацию</label>
        </div>
      </section>

      <section className="admin-editor-section">
        <h2>SEO</h2>
        <div className="admin-form-grid">
          <label className="admin-field admin-field-wide"><span>SEO title</span><input value={form.seoTitle} onChange={(e)=>set("seoTitle",e.target.value)}/></label>
          <label className="admin-field admin-field-wide"><span>SEO description</span><textarea rows={4} value={form.seoDescription} onChange={(e)=>set("seoDescription",e.target.value)}/></label>
          <label className="admin-field admin-field-wide"><span>Canonical URL</span><input value={form.canonicalUrl} onChange={(e)=>set("canonicalUrl",e.target.value)}/></label>
        </div>
      </section>
    </form>
  );
}
