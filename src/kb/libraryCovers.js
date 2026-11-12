export const COVER_CATEGORIES=['全部','色彩','办公','科技','风景'];
const definitions=[
  ['original','原有配色','色彩','#edf3fc','#dbe6f4','plain'],
  ['mint','薄荷灵感','色彩','#d5fff0','#48d5c0','ribbon'],
  ['work','协作空间','办公','#e8e0d5','#9e8472','desk'],
  ['forest','林间晨光','风景','#d6e7d6','#538879','forest'],
  ['waves','流动蓝调','色彩','#e2f3ff','#a7d3fa','waves'],
  ['ribbon','蓝色畅想','科技','#e6ecff','#648fff','ribbon'],
  ['paper','纸上思考','办公','#f5f3ef','#d0c8b9','paper'],
  ['skyline','城市天际','办公','#edf7fb','#9db8ca','city'],
  ['mist','清透之境','科技','#dfe9ec','#31c5cf','cylinders'],
  ['lavender','紫色灵感','色彩','#faf0fc','#ab9ce8','cylinders'],
  ['sand','暖沙时刻','风景','#e8dcc9','#b69a71','hills'],
  ['glass','透明未来','科技','#e7f4ff','#8fc4f5','rings'],
  ['bubbles','蓝色气泡','科技','#e7f4ff','#7398ff','bubbles'],
  ['aqua','水光折影','科技','#dceaf0','#4dbce9','rings'],
  ['marble','白色印记','办公','#f3f3ee','#b8c0bd','paper'],
  ['noir','深林剪影','风景','#242b2b','#487362','forest'],
  ['corridor','建筑之间','办公','#e2e5e7','#677c8d','city'],
  ['cloud','晴空留白','风景','#f3faff','#d3e8fb','waves'],
  ['lilac','轻盈紫调','色彩','#f7edff','#cbb2f4','ribbon'],
  ['rings','环形探索','科技','#daeefa','#3d93c4','rings'],
  ['fold','折纸留白','色彩','#f4f4f3','#d9dfdf','fold'],
];
function coverImage(light,accent,art){
  const scenes={
    plain:'',
    cylinders:'<g transform="translate(42 220) rotate(-18)"><rect width="300" height="92" rx="46" fill="url(#metal)"/><ellipse cx="235" cy="46" rx="27" ry="45" fill="url(#shine)"/><ellipse cx="80" cy="46" rx="19" ry="45" fill="#fbfffa" opacity=".6"/><path d="M120 4v84M128 4v84M207 1v90" stroke="#f8ffff" stroke-width="4" opacity=".8"/></g>',
    ribbon:'<path d="M330 170C170 160 305 315 145 340L410 370 470 220Z" fill="url(#shine)"/><path d="M320 148C145 156 315 310 132 344" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="4"/>',
    desk:'<rect x="5" y="244" width="370" height="100" rx="10" fill="#cdbbab"/><g transform="translate(80 190) rotate(-12)"><rect width="160" height="100" rx="7" fill="#fafafa"/><rect x="12" y="12" width="136" height="72" fill="url(#shine)"/></g><circle cx="300" cy="238" r="34" fill="#fff7ed"/><path d="M300 160v65" stroke="#5c897b" stroke-width="9"/><ellipse cx="315" cy="174" rx="20" ry="10" fill="#6b9b88"/>',
    forest:'<path d="M0 270L80 235 155 262 260 218 400 250V360H0Z" fill="url(#shine)"/><g stroke="#365e50" stroke-width="4" opacity=".65"><path d="M48 340V228m80 95V212m172 120V207m45 110V244"/></g><g fill="#729d86"><circle cx="48" cy="223" r="28"/><circle cx="128" cy="207" r="35"/><circle cx="300" cy="202" r="32"/><circle cx="345" cy="239" r="25"/></g>',
    waves:'<path d="M-40 300C70 180 140 320 250 235S400 230 470 195V360H-40Z" fill="url(#shine)"/><path d="M-20 304C130 205 155 342 310 263S460 269 480 240" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="8"/>',
    paper:'<g transform="translate(100 210) rotate(-13)"><rect x="-12" y="15" width="240" height="150" rx="5" fill="#fff" opacity=".55"/><rect width="220" height="140" rx="5" fill="#fff"/><path d="M25 30h166M25 48h166M25 66h166M25 84h100" stroke="#c8d4d7" stroke-width="3"/></g>',
    city:'<g fill="url(#shine)" stroke="#ffffff" stroke-width="2"><path d="M20 350V252h57v98m15 0V207h66v143m20 0V231h48v119m24 0V185h62v165m20 0V256h53v94"/></g><g stroke="#fff" stroke-opacity=".6" stroke-width="3"><path d="M28 279h46m26-43h51m-51 24h51m107-45h47m-47 23h47m-47 23h47"/></g>',
    hills:'<circle cx="300" cy="238" r="34" fill="#fff7dd"/><path d="M-30 350C25 280 100 216 175 280S295 225 430 292V360H-30Z" fill="url(#shine)"/><path d="M-30 350C105 295 150 349 300 287S420 330 470 320V360H-30Z" fill="#fff5e1" opacity=".6"/>',
    rings:'<g transform="translate(260 290) rotate(-25)"><ellipse rx="140" ry="73" fill="none" stroke="url(#metal)" stroke-width="50"/><ellipse rx="118" ry="51" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/></g>',
    bubbles:'<g fill="url(#shine)" fill-opacity=".5" stroke="#ffffff" stroke-width="2"><circle cx="60" cy="290" r="38"/><circle cx="230" cy="288" r="55"/><circle cx="345" cy="215" r="25"/></g><path d="M25 277q13-27 37-23m132 24q18-32 43-27" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>',
    fold:'<path d="M0 220L205 315 400 180V360H0Z" fill="#fff"/><path d="M0 220L205 315 80 360H0Z" fill="url(#shine)"/><path d="M205 315L400 180V360H270Z" fill="#e9eeee"/>',
  };
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360"><defs><linearGradient id="base" x2=".6" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${light}"/></linearGradient><linearGradient id="shine" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".52" stop-color="${accent}"/><stop offset="1" stop-color="${light}"/></linearGradient><linearGradient id="metal"><stop stop-color="${accent}"/><stop offset=".24" stop-color="#edffff"/><stop offset=".42" stop-color="#5a8bff"/><stop offset=".55" stop-color="#ecffff"/><stop offset=".7" stop-color="${accent}"/><stop offset="1" stop-color="#caffed"/></linearGradient></defs><path fill="url(#base)" d="M0 0h400v360H0z"/>${scenes[art]||''}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
export const LIBRARY_COVERS=definitions.map(([key,label,category,color,accent,art])=>({key,label,category,color,backgroundImage:coverImage(color,accent,art)}));
export function coverPreset(value){return LIBRARY_COVERS.find(c=>c.key===value?.key)||LIBRARY_COVERS[0];}
