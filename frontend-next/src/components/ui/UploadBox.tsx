import './UploadBox.css';

type UploadBoxProps = {
  title: string;
  hint?: string;
  actionText?: string;
};

export function UploadBox({ title, hint = '支持 jpg、png、webp 图片', actionText = '点击上传' }: UploadBoxProps) {
  return (
    <label className="uploadBox">
      <input type="file" accept="image/*" />
      <span className="uploadBoxIcon">+</span>
      <strong>{title}</strong>
      <small>{hint}</small>
      <em>{actionText}</em>
    </label>
  );
}
