import type {
  PropsWithChildren
} from "react";

type PageContainerProps = PropsWithChildren<{
  className?: string;
}>;

export default function PageContainer({
  children,
  className
}: PageContainerProps) {
  const classes =
    className
      ? `page-container ${className}`
      : "page-container";

  return (
    <div className={classes}>
      {children}
    </div>
  );
}