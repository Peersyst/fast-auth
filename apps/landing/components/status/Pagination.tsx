"use client";

import { fmtN } from "./format";

type Props = {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, pages, total, pageSize, onChange }: Props) {
  if (pages <= 1) return null;
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  return (
    <div className="pagination">
      <span className="paginationCount">
        {start}–{end} of {fmtN(total)}
      </span>
      <div className="paginationBtns">
        <button
          type="button"
          className="pageBtn"
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Previous page"
        >
          ←
        </button>
        {Array.from({ length: pages }, (_, i) => (
          <button
            type="button"
            key={i}
            className={`pageBtn${i === page ? " pageBtn--on" : ""}`}
            onClick={() => onChange(i)}
            aria-current={i === page ? "page" : undefined}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          className="pageBtn"
          onClick={() => onChange(Math.min(pages - 1, page + 1))}
          disabled={page === pages - 1}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  );
}
