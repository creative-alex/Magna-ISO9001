import React, { useRef, useEffect, useState } from "react";

function EditableTable({ data, onChange, headersHtml }) {
  const textAreaRefs = useRef({});
  const [colWidths, setColWidths] = useState(() =>
    headersHtml.map((_, i) => (i === 1 ? 1000 : 100))
  );
  const resizingCol = useRef(null);

  useEffect(() => {
    Object.values(textAreaRefs.current).forEach(ref => {
      if (ref) {
        ref.style.height = "auto";
        ref.style.height = ref.scrollHeight + "px";
      }
    });
  }, [data]);

  const handleInput = e => {
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  // Funções para resize
  const handleMouseDown = (e, colIdx) => {
    resizingCol.current = { startX: e.clientX, colIdx, startWidth: colWidths[colIdx] };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
  };

  const handleMouseMove = e => {
    if (!resizingCol.current) return;
    const { startX, colIdx, startWidth } = resizingCol.current;
    const delta = e.clientX - startX;
    setColWidths(widths =>
      widths.map((w, i) => (i === colIdx ? Math.max(50, startWidth + delta) : w))
    );
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="editable-table-container">
      <table className="editable-table" border="1" cellPadding={4}>
        <thead>
          <tr>
            {headersHtml.map((header, i) => (
              <th
                key={i}
                className="editable-table-header"
                style={{
                  whiteSpace: "pre-line",
                  textAlign: "center",
                  position: "relative",
                  width: colWidths[i],
                  minWidth: 50,
                }}
              >
                {header}
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    height: "100%",
                    width: 8,
                    cursor: "col-resize",
                    zIndex: 2,
                  }}
                  onMouseDown={e => handleMouseDown(e, i)}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="editable-table-row">
              {row.map((cell, colIdx) => (
                <td
                  key={colIdx}
                  className="editable-table-cell"
                  style={{ width: colWidths[colIdx], minWidth: 50 }}
                >
                  <textarea
                    ref={el => (textAreaRefs.current[`${rowIdx}-${colIdx}`] = el)}
                    className="editable-table-textarea"
                    style={{ width: "100%", height: "auto", resize: "none" }}
                    value={cell}
                    onChange={e => onChange(rowIdx, colIdx, e.target.value)}
                    onInput={handleInput}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EditableTable;