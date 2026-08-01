import FamilyNav from './FamilyNav';

export default function FamilyPageHeader({ title, description }) {
  return (
    <header>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bank-700">
        Family Banking
      </p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-3xl text-slate-600">{description}</p>}
      <FamilyNav />
    </header>
  );
}
