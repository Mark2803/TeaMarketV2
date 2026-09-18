import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type BackLinkProps = {
  to: string;
  label: string;
};

export default function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link to={to} className="page-back-link">
      <ArrowLeft size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
