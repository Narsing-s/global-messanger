(() => {
  if (document.getElementById('gm-workspace-tools-style')) return;
  const style = document.createElement('style');
  style.id = 'gm-workspace-tools-style';
  style.textContent = `
    .workspace-tools{display:flex;align-items:center;gap:6px;margin-top:-2px}
    .workspace-tool{height:34px;padding:0 11px;border:1px solid #e1e6f1;border-radius:11px;background:#fff;display:flex;align-items:center;gap:6px;font-size:9px;font-weight:800;white-space:nowrap;color:#596783;transition:.15s ease}
    .workspace-tool:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(54,73,120,.12);border-color:#cdd5ff}
    .product-tool{color:#5265e8;background:#f5f6ff}
    .messenger-tool{color:#52606f;background:#f8fafc}
    @media(max-width:760px){.workspace-tools{gap:4px}.workspace-tool{height:32px;padding:0 8px;font-size:8px}.workspace-tool span{display:none}}
  `;
  document.head.appendChild(style);
})();
