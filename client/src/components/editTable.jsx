import React, { useRef, useEffect } from "react";

function EditableTable({ data, onChange, headersHtml }) {
  const textAreaRefs = useRef({});

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

  return (
    <table border="1" cellPadding={4}>
      <thead>
        <tr>
          {headersHtml.map((header, i) => (
            <th key={i} style={{ whiteSpace: "pre-line", textAlign: "center" }}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell, colIdx) => (
              <td key={colIdx}>
                <textarea
                  ref={el => (textAreaRefs.current[`${rowIdx}-${colIdx}`] = el)}
                  style={{ width: "100px", minHeight: 30, resize: "none", overflow: "hidden" }}
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
  );
}

export default EditableTable;