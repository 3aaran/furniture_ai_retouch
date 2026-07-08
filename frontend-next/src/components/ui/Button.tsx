import './Button.css';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button(props: ButtonProps) {
  const { variant = 'primary', className = '', children, ...rest } = props;
  return (
    <button className={`uiButton uiButton--${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
