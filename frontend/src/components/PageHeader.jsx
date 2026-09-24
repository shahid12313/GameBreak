/* Photo banner shown at the top of inner pages. */
export default function PageHeader({ img, eyebrow, title, children }) {
  return (
    <header className="page-head">
      {img && <img src={img} alt="" className="page-head-bg" />}
      <div className="page-head-shade" />
      <div className="wrap page-head-in">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="page-head-sub">{children}</p>}
      </div>
    </header>
  );
}
