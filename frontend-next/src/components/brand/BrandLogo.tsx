import { BRAND, BRAND_ASSETS } from '../../config/brand';
import './BrandLogo.css';

type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={`brandLogo ${compact ? 'brandLogo--compact' : ''}`.trim()}>
      <span className="brandLogoMark" aria-hidden="true">
        <img src={BRAND_ASSETS.mark} alt="" />
      </span>
      {!compact && (
        <span className="brandLogoText">
          <b>{BRAND.name}</b>
          <small>{BRAND.subtitle}</small>
        </span>
      )}
    </div>
  );
}
