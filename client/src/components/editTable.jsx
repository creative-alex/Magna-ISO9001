import React from "react";

export default function EditableTable({ data, onChange, headersHtml }) {
  return (
    <table border="1" cellPadding={4}>
      <thead>
        <tr>
          {headersHtml.map((header, idx) => (
            <th key={idx} style={{ whiteSpace: "pre-line", textAlign: "center" }}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIdx) => (
          <tr key={rowIdx}>
            {row.map((cell, colIdx) => (
              <td key={colIdx}>
                <textarea
                  style={{
                    width: "100px",
                    minHeight: "30px",
                    resize: "none",
                    overflow: "hidden",
                  }}
                  value={cell}
                  onChange={e => onChange(rowIdx, colIdx, e.target.value)}
                  onInput={e => {
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}