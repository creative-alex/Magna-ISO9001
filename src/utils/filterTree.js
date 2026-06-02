export function filterTree(nodes, searchTerm) {
  if (!searchTerm) return nodes;
  return nodes.map(node => {
    if (node.type === "folder") {
      const filteredChildren = filterTree(node.children || [], searchTerm);
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(searchTerm.toLowerCase()))
        return { ...node, children: filteredChildren };
      return null;
    }
    return node.name.toLowerCase().includes(searchTerm.toLowerCase()) ? node : null;
  }).filter(Boolean);
}
