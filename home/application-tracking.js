const API_BASE="http://localhost:5000";
const steps=[{title:"Application Submitted",text:"Your bus pass application has been received."},{title:"Documents Verified",text:"Your uploaded documents are being checked."},{title:"Payment Completed",text:"Your payment has been received successfully."},{title:"Admin Review",text:"The Transport Office is reviewing your application."},{title:"Pass Approved",text:"Your approved pass will be available in My Pass."}];
let currentApplication=null;

document.addEventListener("DOMContentLoaded",loadTracking);

async function loadTracking(){
 const state=BPApplication.load();
 const user=BPApplication.user();
 if(!state||!user?.id){renderEmpty();return;}
 try{
  const response=await fetch(`${API_BASE}/api/history?userId=${encodeURIComponent(user.id)}`,{cache:"no-store"});
  const result=await response.json();
  if(!response.ok||!result.success)throw new Error(result.message||"Could not load application status.");
  const applicationId=String(state.applicationId||"");
  const serverApplication=(result.history||[]).find(item=>String(item.application_id)===applicationId);
  if(serverApplication){currentApplication=serverApplication;renderTracking(currentApplication);return;}
 }catch(error){console.warn("Could not refresh application status:",error.message);}
 currentApplication={
  application_id:state.applicationId, pass_type_name:state.passType, application_status:trackingStatus(state.status),
  created_at:"", updated_at:"", from_stop:state.route?.fromStop, to_stop:state.route?.toStop,
  bus_type_name:state.route?.busType, plan_name:state.plan?.planName, plan_amount:state.plan?.amount,
  transaction_id:state.payment?.transactionId, paid_amount:state.payment?.amount,
  payment_status:state.payment?.status === "Success" ? "success" : ""
 };
 renderTracking(currentApplication);
}

function trackingStatus(status){
 const value=String(status||"Draft").toLowerCase();
 if(value.includes("payment successful"))return "paid";
 if(value.includes("plan"))return "payment_pending";
 if(value.includes("details")||value.includes("route"))return "document_pending";
 return "draft";
}

function renderTracking(app){
 const s=String(app.application_status||"submitted").toLowerCase();
 document.getElementById("applicationId").textContent=`APP-${String(app.application_id).padStart(5,"0")}`;
 document.getElementById("passType").textContent=app.pass_type_name||"Bus Pass";
 const pill=document.getElementById("statusPill"); pill.className="status-pill";
 if(s==="rejected"){pill.classList.add("rejected");pill.innerHTML='<i class="fa-solid fa-circle-xmark"></i> Rejected';}
 else if(["paid","approved","completed"].includes(s)){pill.classList.add("success");pill.innerHTML=`<i class="fa-solid fa-circle-check"></i> ${fmt(s)}`;}
 else{pill.innerHTML=`<i class="fa-solid fa-clock"></i> ${fmt(s)}`;}
 let active=0;if(s==="submitted")active=1;else if(s==="document_pending")active=1;else if(s==="payment_pending")active=2;else if(s==="paid")active=4;else if(["approved","completed"].includes(s))active=5;
 document.getElementById("progressCount").textContent=s==="rejected"?"—":`${active}/5`;
 document.getElementById("progressTitle").textContent=s==="paid"?"Payment received — review pending":s==="approved"||s==="completed"?"Your pass is approved":s==="rejected"?"Application needs attention":"Application is in progress";
 document.getElementById("timeline").innerHTML=steps.map((x,i)=>{
  let state="";
  if(s==="rejected")state=i<3?"done":i===3?"rejected":"";
  else if(["approved","completed"].includes(s))state="done";
  else if(s==="paid")state=i<3?"done":i===3?"current":"";
  else if(s==="document_pending")state=i===0?"done":i===1?"current":"";
  else if(s==="payment_pending")state=i===0?"done":i===1?"current":"";
  else if(s==="submitted")state=i===0?"done":i===1?"current":"";
  else state=i===0?"current":"";
  const icon=state==="done"?"fa-check":state==="current"?"fa-clock":state==="rejected"?"fa-xmark":"fa-circle";
  const d=(i===0&&app.created_at)?date(app.created_at):(i===2&&app.payment_date)?date(app.payment_date):(i===4&&app.updated_at&&["approved","completed"].includes(s))?date(app.updated_at):"";
  return `<div class="timeline-item ${state}"><div class="timeline-dot"><i class="fa-solid ${icon}"></i></div><div class="timeline-copy"><strong>${x.title}</strong><span>${x.text}</span>${d?`<time>${d}</time>`:""}</div></div>`;
 }).join("");
 const icon=document.querySelector(".status-icon i"),title=document.getElementById("nextTitle"),text=document.getElementById("nextText");
 const rejectionCard=document.getElementById("rejectionCard"),reason=document.getElementById("rejectionReasonText"),reapply=document.getElementById("reapplyButton");
 if(rejectionCard) rejectionCard.hidden=s!=="rejected";
 if(s==="rejected"){
  icon.className="fa-solid fa-circle-xmark";title.textContent="Your application was rejected.";text.textContent="The Transport Office provided a reason below. Correct the details and documents, then submit a fresh application.";
  if(reason)reason.textContent=app.rejection_reason||"The submitted details or documents could not be verified. Please correct them and apply again.";
  if(reapply)reapply.onclick=()=>startReapply(app);
 }else if(["approved","completed"].includes(s)){
  icon.className="fa-solid fa-id-card";title.textContent="Your pass is ready.";text.textContent="Your administrator-approved bus pass is available in My Pass.";const b=document.querySelector(".dashboard-button");b.innerHTML='<i class="fa-solid fa-id-card"></i> View My Pass';b.onclick=()=>location.href="my-pass.html";
 }else if(s==="paid"){icon.className="fa-solid fa-user-shield";title.textContent="Admin verification is next.";text.textContent="Payment is complete. Your application is waiting for document and application review.";
 }else if(s==="document_pending"){icon.className="fa-solid fa-file-circle-check";title.textContent="Verify your documents.";text.textContent="Complete document verification before the application moves forward.";
 }else{icon.className="fa-solid fa-hourglass-half";title.textContent="Your application is moving forward.";text.textContent="Complete any remaining application step shown in the tracker.";}
}

async function startReapply(app){
 if(!app?.pass_type_name)return;
 BPApplication.startNew(app.pass_type_name);
 window.location.href=String(app.pass_type_name).toLowerCase().includes("employee") ? "employee-details.html" : "student-details.html";
}
function date(v){const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
function fmt(v){return String(v||"Pending").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
function renderEmpty(){document.getElementById("applicationId").textContent="No active application";document.getElementById("passType").textContent="Apply for a bus pass";document.getElementById("statusPill").innerHTML='<i class="fa-solid fa-circle-info"></i> No Application';document.getElementById("progressTitle").textContent="Nothing to track yet";document.getElementById("progressCount").textContent="0/5";document.getElementById("timeline").innerHTML=steps.map((x,i)=>`<div class="timeline-item"><div class="timeline-dot"><i class="fa-solid fa-circle"></i></div><div class="timeline-copy"><strong>${x.title}</strong><span>${i?"Waiting for the previous step.":"Start a new pass application to begin tracking."}</span></div></div>`).join("");document.getElementById("nextTitle").textContent="No application found.";document.getElementById("nextText").textContent="Apply for a new bus pass and this tracker will follow its progress.";document.getElementById("rejectionCard").hidden=true}
function renderOffline(){document.getElementById("applicationId").textContent="Status unavailable";document.getElementById("statusPill").innerHTML='<i class="fa-solid fa-wifi"></i> Offline';document.getElementById("progressTitle").textContent="Could not refresh status";document.getElementById("progressCount").textContent="—";document.getElementById("timeline").innerHTML='<div class="timeline-item current"><div class="timeline-dot"><i class="fa-solid fa-rotate"></i></div><div class="timeline-copy"><strong>Try refreshing</strong><span>Connect to the server and refresh this screen to load your latest application status.</span></div></div>';document.getElementById("nextTitle").textContent="Your data is safe.";document.getElementById("nextText").textContent="We could not reach the application server right now.";document.getElementById("rejectionCard").hidden=true}
function goBack(){history.length>1?history.back():location.href="dashboard.html"}
function goDashboard(){location.href="dashboard.html"}
