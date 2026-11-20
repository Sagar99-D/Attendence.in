const STORAGE_KEY = "attendence_in_data_v1";
const today = () => new Date().toISOString().slice(0,10);
let data = loadData();
let selectedToday = new Set();
let toastTimer;

function loadData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{subjects:[],records:[]}}catch{return {subjects:[],records:[]}}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));renderAll()}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stats(subjectId){const records=data.records.filter(r=>r.subjectId===subjectId);const attended=records.filter(r=>r.status==='Present').length;return {total:records.length,attended,missed:records.length-attended,pct:records.length?attended/records.length*100:0}}
function overall(){const total=data.records.length,attended=data.records.filter(r=>r.status==='Present').length;return {total,attended,missed:total-attended,pct:total?attended/total*100:0}}
function fmtDate(d){return new Date(d+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}
function barClass(p){return p>=75?'greenbar':p>=65?'yellowbar':'redbar'}
function statusColor(p){return p>=75?'var(--green)':p>=65?'var(--yellow)':'var(--red)'}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300)}
function go(page){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===page));document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const titles={dashboard:'Dashboard',daily:'Daily attendance',subjects:'My subjects',history:'Attendance history',calculator:'Attendance calculator'};document.getElementById('pageTitle').textContent=titles[page]||'Dashboard';if(page==='daily')renderDaily();if(page==='history')renderHistory();if(page==='calculator')renderCalculator();window.scrollTo(0,0)}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
document.getElementById('datePill').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
document.getElementById('attendanceDate').value=today();

function renderDashboard(){
 const o=overall();document.getElementById('statSubjects').textContent=data.subjects.length;document.getElementById('statClasses').textContent=o.total;document.getElementById('statAttended').textContent=o.attended;document.getElementById('statPercent').textContent=o.pct.toFixed(1)+'%';document.getElementById('statMissed').textContent=o.missed+' classes missed';
 const grid=document.getElementById('subjectOverview'),empty=document.getElementById('dashboardEmpty');empty.hidden=data.subjects.length>0;
 grid.innerHTML=data.subjects.map(s=>{const x=stats(s.id);return `<article class="subject-card"><div class="subject-card-head"><h3>${escapeHtml(s.name)}</h3><span class="percent" style="color:${statusColor(x.pct)}">${x.pct.toFixed(1)}%</span></div><div class="progress ${barClass(x.pct)}"><span style="width:${Math.min(100,x.pct)}%"></span></div><div class="subject-meta"><span>${x.attended} attended · ${x.missed} missed</span><span>${x.total} classes</span></div></article>`}).join('');
}
function renderDaily(){
 const date=document.getElementById('attendanceDate').value||today();const list=document.getElementById('dailySubjectList');
 list.innerHTML=data.subjects.map(s=>`<label class="check-item"><input type="checkbox" value="${s.id}" ${selectedToday.has(s.id)?'checked':''}><span>${escapeHtml(s.name)}</span></label>`).join('')||'<p class="muted">Add subjects first in My subjects.</p>';
 list.querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>{i.checked?selectedToday.add(i.value):selectedToday.delete(i.value);updateSelectedCount()}));
 // A date change resets current selection and refreshes whether records already exist.
 selectedToday=new Set([...selectedToday].filter(id=>data.subjects.some(s=>s.id===id)));
 updateSelectedCount();renderMarkPanel(date);
}
function updateSelectedCount(){document.getElementById('selectedCount').textContent=selectedToday.size+' subject'+(selectedToday.size===1?'':'s')+' selected'}
function renderMarkPanel(date){
 const existing=data.records.filter(r=>r.date===date);const panel=document.getElementById('markPanel');
 if(!existing.length){panel.hidden=true;return}
 panel.hidden=false;document.getElementById('markList').innerHTML=existing.map(r=>{const s=data.subjects.find(x=>x.id===r.subjectId);return s?`<div class="mark-row"><strong>${escapeHtml(s.name)}</strong><div class="choice-group"><button class="choice present ${r.status==='Present'?'selected':''}" data-record="${r.id}" data-status="Present">✓ Present</button><button class="choice absent ${r.status==='Absent'?'selected':''}" data-record="${r.id}" data-status="Absent">✕ Absent</button></div></div>`:''}).join('');
 document.querySelectorAll('[data-record]').forEach(b=>b.addEventListener('click',()=>{const r=data.records.find(x=>x.id===b.dataset.record);if(r){r.status=b.dataset.status;save();showToast('Attendance updated')}}));
}
document.getElementById('addClassesBtn').addEventListener('click',()=>{
 const date=document.getElementById('attendanceDate').value;if(!date){showToast('Please choose a date');return}if(!selectedToday.size){showToast('Select at least one subject');return}
 let added=0;for(const id of selectedToday){if(data.records.some(r=>r.subjectId===id&&r.date===date)){continue}data.records.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),subjectId:id,date,status:'Absent'});added++}
 save();renderDaily();showToast(added?added+' class record(s) added':'Those classes are already recorded for this date');
});
document.getElementById('attendanceDate').addEventListener('change',()=>{selectedToday.clear();renderDaily()});
document.getElementById('finishBtn').addEventListener('click',()=>{go('dashboard');showToast('Attendance saved successfully')});

document.getElementById('subjectForm').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('subjectName');const name=input.value.trim();if(!name)return;if(data.subjects.some(s=>s.name.toLowerCase()===name.toLowerCase())){showToast('This subject already exists');return}data.subjects.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name});input.value='';save();showToast('Subject added')});
function renderSubjects(){const el=document.getElementById('subjectManageList');el.innerHTML=data.subjects.map(s=>`<div class="manage-item"><strong>${escapeHtml(s.name)}</strong><div class="manage-actions"><button class="small-btn" data-edit="${s.id}">Rename</button><button class="small-btn delete" data-delete="${s.id}">Delete</button></div></div>`).join('')||'<div class="panel"><p class="muted">No subjects yet. Add your first subject above.</p></div>';
 el.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const s=data.subjects.find(x=>x.id===b.dataset.edit);const name=prompt('Enter the new subject name:',s.name);if(name&&name.trim()){if(data.subjects.some(x=>x.id!==s.id&&x.name.toLowerCase()===name.trim().toLowerCase())){showToast('That subject already exists');return}s.name=name.trim();save();showToast('Subject renamed')}}));
 el.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{const s=data.subjects.find(x=>x.id===b.dataset.delete);if(confirm(`Delete "${s.name}" and all its attendance records?`)){data.subjects=data.subjects.filter(x=>x.id!==s.id);data.records=data.records.filter(r=>r.subjectId!==s.id);selectedToday.delete(s.id);save();showToast('Subject deleted')}}));
}
function renderHistory(){const filter=document.getElementById('historyFilter'),old=filter.value;filter.innerHTML='<option value="all">All subjects</option>'+data.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');filter.value=data.subjects.some(s=>s.id===old)?old:'all';
 const rows=data.records.filter(r=>filter.value==='all'||r.subjectId===filter.value).sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{const s=data.subjects.find(x=>x.id===r.subjectId);return s?`<tr><td>${fmtDate(r.date)}</td><td><strong>${escapeHtml(s.name)}</strong></td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td><td><button class="small-btn" data-history-edit="${r.id}">Change</button> <button class="small-btn delete" data-history-delete="${r.id}">Delete</button></td></tr>`:''}).join('');
 document.getElementById('historyRows').innerHTML=rows;document.getElementById('historyEmpty').hidden=!!rows;
 document.querySelectorAll('[data-history-edit]').forEach(b=>b.addEventListener('click',()=>{const r=data.records.find(x=>x.id===b.dataset.historyEdit);r.status=r.status==='Present'?'Absent':'Present';save();showToast('Attendance changed to '+r.status)}));
 document.querySelectorAll('[data-history-delete]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Delete this attendance record?')){data.records=data.records.filter(x=>x.id!==b.dataset.historyDelete);save();showToast('Record deleted')}}));
}
document.getElementById('historyFilter').addEventListener('change',renderHistory);
function renderCalculator(){const sel=document.getElementById('calcSubject'),old=sel.value;sel.innerHTML=data.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');if(data.subjects.some(s=>s.id===old))sel.value=old;calculate()}
function calculate(){const s=data.subjects.find(x=>x.id===document.getElementById('calcSubject').value),el=document.getElementById('calcResult');if(!s){el.innerHTML='<p class="muted">Add a subject first to use the calculator.</p>';return}const x=stats(s.id);let needed=0;if(x.pct<75){while((x.attended+needed)/(x.total+needed||1)<.75&&needed<10000)needed++}const canMiss=x.total===0?0:Math.max(0,Math.floor((x.attended/.75)-x.total));el.innerHTML=`<div class="muted">${escapeHtml(s.name)} · Current attendance</div><div class="calc-big">${x.pct.toFixed(1)}%</div><p>${x.attended} attended out of ${x.total} total classes.</p><hr style="border:0;border-top:1px solid var(--line);margin:15px 0"><p><strong>${needed===0?'You have reached the 75% target!':`Attend the next ${needed} class${needed===1?'':'es'} consecutively`}</strong> to reach at least 75%.</p><p>You can miss approximately <strong>${canMiss}</strong> upcoming class${canMiss===1?'':'es'} and remain at or above 75%, assuming you attend all other classes.</p>`}
document.getElementById('calcSubject').addEventListener('change',calculate);
document.getElementById('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('attendence_theme',document.body.classList.contains('dark')?'dark':'light')});
if(localStorage.getItem('attendence_theme')==='dark')document.body.classList.add('dark');
function renderAll(){renderDashboard();renderSubjects();renderDaily();renderHistory();renderCalculator()}
renderAll();
