import './Card.css';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <section className={`uiCard ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}
