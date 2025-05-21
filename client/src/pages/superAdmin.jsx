import React, { useEffect, useState } from "react";

function PdfTable() {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/files/get-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "dummy" }),
    })
      .then(res => res.json())
      .then(data => setLines(data.lines || []));
  }, []);

  return (
    <table border="1">
      <thead>
        <tr>
          <th>Linha</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, idx) => (
          <tr key={idx}>
            <td>{line}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default PdfTable;
