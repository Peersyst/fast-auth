type Props = {
  num: string;
  title: string;
  hint?: string;
  id?: string;
};

export default function SectionLabel({ num, title, hint, id }: Props) {
  return (
    <header className="sectionLabel" id={id}>
      <span className="sectionLabelNum">{num}</span>
      <h2>{title}</h2>
      {hint ? <span className="sectionLabelHint">{hint}</span> : null}
    </header>
  );
}
