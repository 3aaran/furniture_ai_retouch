import './PlaceholderPage.css';

type PlaceholderPageProps = {
  title: string;
  desc: string;
};

export function PlaceholderPage({ title, desc }: PlaceholderPageProps) {
  return (
    <div className="pageContainer placeholderPage">
      <section className="cardSurface placeholderCard">
        <span>FRONTEND NEXT</span>
        <h1>{title}</h1>
        <p>{desc}</p>
      </section>
    </div>
  );
}
