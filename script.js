/* =====================================================
   NUTRITRACK - SCRIPT.JS
   PART 1
   Date-wise data + Profile + Food + Water + Micros
===================================================== */

const defaultData={
 profile:{name:"",age:0,gender:"",height:0,currentWeight:0,targetWeight:0,goal:"loss",activityLevel:1.2},
 days:{},
 weights:[],
 startingWeight:0
};

let appData;
try{
 appData=JSON.parse(localStorage.getItem("nutriTrackData"))||defaultData;
}catch(e){appData=defaultData;}

if(!appData.profile)appData.profile={...defaultData.profile};
if(!appData.days)appData.days={};
if(!Array.isArray(appData.weights))appData.weights=[];
if(!appData.startingWeight)appData.startingWeight=Number(localStorage.getItem("nutriStartingWeight"))||0;

let selectedDate=getDateKey(new Date());

/* ---------- DATE ---------- */

function getDateKey(date){
 const d=date instanceof Date?date:new Date(date);
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function formatDate(key){
 if(!key)return"";
 const p=key.split("-");
 if(p.length!==3)return key;
 return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
}

function changeDate(value){
 if(!value)return;
 selectedDate=value;
 getDay(selectedDate);
 saveData();
 refresh();
}

function previousDay(){
 const d=new Date(selectedDate+"T00:00:00");
 d.setDate(d.getDate()-1);
 changeDate(getDateKey(d));
}

function nextDay(){
 const d=new Date(selectedDate+"T00:00:00");
 d.setDate(d.getDate()+1);
 changeDate(getDateKey(d));
}

function goToToday(){
 changeDate(getDateKey(new Date()));
}

function updateDate(){
 const e=document.getElementById("currentDate");
 if(e)e.textContent=formatDate(selectedDate);
 const picker=document.getElementById("datePicker");
 if(picker)picker.value=selectedDate;
}

/* ---------- DAILY DATA ---------- */

function emptyDay(){
 return{
  foods:[],
  water:0,
  micronutrients:{
   calcium:0,magnesium:0,iron:0,sodium:0,potassium:0,
   zinc:0,vitaminC:0,vitaminD:0,omega3:0
  },
  activity:{steps:0,walking:0,workout:0},
  exercises:[],
  notes:"",
  savedAt:""
 };
}

function getDay(key=selectedDate){
 if(!appData.days[key])appData.days[key]=emptyDay();
 const d=appData.days[key];
 if(!Array.isArray(d.foods))d.foods=[];
 if(!d.micronutrients)d.micronutrients=emptyDay().micronutrients;
 if(!d.activity)d.activity=emptyDay().activity;
 if(!Array.isArray(d.exercises))d.exercises=[];
 return d;
}

function saveData(){
 localStorage.setItem("nutriTrackData",JSON.stringify(appData));
}

/* ---------- OLD DATA MIGRATION ---------- */

if(Array.isArray(appData.foods)&&appData.foods.length){
 getDay(getDateKey(new Date())).foods=appData.foods;
 delete appData.foods;
}
if(typeof appData.water==="number"){
 getDay(getDateKey(new Date())).water=appData.water;
 delete appData.water;
}
if(appData.activity){
 getDay(getDateKey(new Date())).activity=appData.activity;
 delete appData.activity;
}
saveData();

/* ---------- MESSAGE ---------- */

function showMessage(msg){
 const toast=document.getElementById("toast");
 if(toast){
  toast.textContent=msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),2200);
 }else{
  alert(msg);
 }
}

/* ---------- PROFILE ---------- */

function loadProfile(){
 const p=appData.profile;
 const set=(id,value)=>{
  const e=document.getElementById(id);
  if(e)e.value=value??"";
 };
 set("userName",p.name);
 set("age",p.age);
 set("gender",p.gender);
 set("height",p.height);
 set("currentWeight",p.currentWeight);
 set("weightGoal",p.targetWeight);
 set("goal",p.goal||"loss");
 set("activityLevel",p.activityLevel||1.2);
 set("calculatorActivity",p.activityLevel||1.2);
}

function saveProfile(){
 const val=id=>document.getElementById(id)?.value;
 appData.profile.name=(val("userName")||"").trim();
 appData.profile.age=Number(val("age"))||0;
 appData.profile.gender=(val("gender")||"").toLowerCase();
 appData.profile.height=Number(val("height"))||0;
 appData.profile.currentWeight=Number(val("currentWeight"))||0;
 appData.profile.targetWeight=Number(val("weightGoal"))||0;
 appData.profile.goal=val("goal")||"loss";
 appData.profile.activityLevel=Number(val("activityLevel"))||1.2;

 if(appData.profile.currentWeight>0&&!appData.startingWeight){
  appData.startingWeight=appData.profile.currentWeight;
  localStorage.setItem("nutriStartingWeight",appData.startingWeight);
 }
 saveData();
 calculateHealthMetrics();
 updateNutrition();
 updateGoal();
 showMessage("Profile saved successfully!");
}

/* ---------- BMI / BMR / TDEE ---------- */

function calculateBMI(h,w){
 if(!h||!w||h<=0||w<=0)return null;
 h=h/100;
 return w/(h*h);
}

function calculateBMR(age,height,weight,gender){
 if(!age||!height||!weight||!gender)return null;
 if(gender.toLowerCase()==="male")return 10*weight+6.25*height-5*age+5;
 if(gender.toLowerCase()==="female")return 10*weight+6.25*height-5*age-161;
 return null;
}

function bmiCategory(bmi){
 if(bmi===null)return"Enter height and weight";
 if(bmi<18.5)return"Underweight";
 if(bmi<25)return"Normal range";
 if(bmi<30)return"Overweight";
 return"Obesity range";
}

function getCalorieTarget(tdee){
 const goal=appData.profile.goal||"loss";
 if(goal==="loss")return Math.max(1200,Math.round(tdee-500));
 if(goal==="gain")return Math.round(tdee+250);
 return Math.round(tdee);
}

function calculateHealthMetrics(){
 const p=appData.profile;
 const age=Number(document.getElementById("age")?.value)||p.age;
 const height=Number(document.getElementById("height")?.value)||p.height;
 const weight=Number(document.getElementById("currentWeight")?.value)||p.currentWeight;
 const gender=document.getElementById("gender")?.value||p.gender;
 const activity=Number(document.getElementById("calculatorActivity")?.value)||p.activityLevel||1.2;

 const bmi=calculateBMI(height,weight);
 const bmr=calculateBMR(age,height,weight,gender);
 const tdee=bmr?bmr*activity:null;

 setText("bmiValue",bmi!==null?bmi.toFixed(1):"--");
 setText("bmiCategory",bmiCategory(bmi));
 setText("bmrValue",bmr!==null?Math.round(bmr):"--");
 setText("calculatorBMR",bmr!==null?Math.round(bmr)+" kcal":"-- kcal");
 setText("tdeeValue",tdee!==null?Math.round(tdee):"--");
 setText("calculatorTDEE",tdee!==null?Math.round(tdee)+" kcal":"-- kcal");
 setText("activityMultiplier",tdee!==null?activity.toFixed(3):"--");

 if(tdee) setText("calorieTarget",getCalorieTarget(tdee));
}

/* ---------- FOOD ---------- */

function addFood(){
 const v=id=>document.getElementById(id)?.value;
 const name=(v("foodName")||"").trim();
 if(!name){
  showMessage("Please enter food name.");
  return;
 }

 getDay().foods.push({
  id:Date.now(),
  name:name,
  meal:v("mealType")||"Breakfast",
  quantity:Number(v("foodQuantity"))||0,
  calories:Number(v("foodCalories"))||0,
  protein:Number(v("foodProtein"))||0,
  carbs:Number(v("foodCarbs"))||0,
  fat:Number(v("foodFat"))||0,
  fiber:Number(v("foodFiber"))||0
 });

 saveData();
 clearFoodForm();
 renderFoods();
 updateNutrition();
}

function clearFoodForm(){
 ["foodName","foodQuantity","foodCalories","foodProtein","foodCarbs","foodFat","foodFiber"].forEach(id=>{
  const e=document.getElementById(id);
  if(e)e.value="";
 });
}

function renderFoods(){
 const ids={
  "Breakfast":"Breakfast",
  "Morning Snack":"MorningSnack",
  "Lunch":"Lunch",
  "Pre Workout":"PreWorkout",
  "Post Workout":"PostWorkout",
  "Evening Snack":"EveningSnack",
  "Dinner":"Dinner"
 };

 Object.values(ids).forEach(id=>{
  const e=document.getElementById(id);
  if(e)e.innerHTML='<p class="food-info">No food added yet.</p>';
 });

 const grouped={};
 getDay().foods.forEach(f=>{
  if(!grouped[f.meal])grouped[f.meal]=[];
  grouped[f.meal].push(f);
 });

 Object.keys(grouped).forEach(meal=>{
  const box=document.getElementById(ids[meal]);
  if(!box)return;
  box.innerHTML="";
  grouped[meal].forEach(f=>{
   const item=document.createElement("div");
   item.className="food-item";
   item.innerHTML=`
    <div>
     <strong>${escapeHTML(f.name)}</strong>
     <span class="food-info">${f.quantity}g/ml • ${f.calories} kcal • Protein ${f.protein}g • Carbs ${f.carbs}g • Fat ${f.fat}g • Fiber ${f.fiber}g</span>
    </div>
    <button class="delete-food" onclick="deleteFood(${f.id})">Delete</button>`;
   box.appendChild(item);
  });
 });
}

function deleteFood(id){
 getDay().foods=getDay().foods.filter(f=>f.id!==id);
 saveData();
 renderFoods();
 updateNutrition();
}

function calculateNutrition(key=selectedDate){
 const foods=getDay(key).foods;
 return foods.reduce((t,f)=>({
  calories:t.calories+(Number(f.calories)||0),
  protein:t.protein+(Number(f.protein)||0),
  carbs:t.carbs+(Number(f.carbs)||0),
  fat:t.fat+(Number(f.fat)||0),
  fiber:t.fiber+(Number(f.fiber)||0)
 }),{calories:0,protein:0,carbs:0,fat:0,fiber:0});
}

function updateNutrition(){
 const n=calculateNutrition();
 setText("totalCalories",Math.round(n.calories));
 setText("totalProtein",n.protein.toFixed(1));
 setText("totalCarbs",n.carbs.toFixed(1));
 setText("totalFat",n.fat.toFixed(1));
 setText("totalFiber",n.fiber.toFixed(1));

 const p=appData.profile;
 const bmr=calculateBMR(p.age,p.height,p.currentWeight,p.gender);
 const target=bmr?getCalorieTarget(bmr*(p.activityLevel||1.2)):2200;

 setText("calorieTarget",target);
 updateProgress("calorieProgress",n.calories,target);
 updateProgress("proteinProgress",n.protein,120);
 updateProgress("carbProgress",n.carbs,250);
 updateProgress("fatProgress",n.fat,70);
 updateProgress("fiberProgress",n.fiber,30);

 setText("reportCalories",Math.round(n.calories)+" kcal");
 setText("reportProtein",n.protein.toFixed(1)+" g");
 setText("reportCarbs",n.carbs.toFixed(1)+" g");
 setText("reportFat",n.fat.toFixed(1)+" g");
}

/* ---------- WATER ---------- */

function addWater(amount){
 getDay().water=Math.min(10000,(Number(getDay().water)||0)+Number(amount));
 saveData();
 updateWater();
}

function resetWater(){
 getDay().water=0;
 saveData();
 updateWater();
}

function updateWater(){
 const amount=Number(getDay().water)||0;
 setText("waterAmount",amount);
 setText("reportWater",amount+" ml");
 updateProgress("waterProgress",amount,3000);
}

/* ---------- MICRONUTRIENTS ---------- */

const microInfo={
 calcium:{unit:"mg",male:1000,female:1000},
 magnesium:{unit:"mg",male:400,female:310},
 iron:{unit:"mg",male:8,female:18},
 sodium:{unit:"mg",male:2300,female:2300},
 potassium:{unit:"mg",male:3400,female:2600},
 zinc:{unit:"mg",male:11,female:8},
 vitaminC:{unit:"mg",male:90,female:75},
 vitaminD:{unit:"mcg",male:15,female:15},
 omega3:{unit:"mg",male:1600,female:1100}
};

function updateMicronutrients(){
 const d=getDay();
 Object.keys(microInfo).forEach(name=>{
  const info=microInfo[name];
  const value=Number(d.micronutrients[name])||0;
  const target=appData.profile.gender==="female"?info.female:info.male;

  setText(name,value+" "+info.unit);
  setText(name+"Target",target+" "+info.unit);

  const input=document.getElementById(name+"Input");
  if(input)input.value=value||"";

  updateProgress(name+"Progress",value,target);
 });
}

function saveMicronutrients(){
 const d=getDay();
 Object.keys(microInfo).forEach(name=>{
  const input=document.getElementById(name+"Input");
  if(input)d.micronutrients[name]=Math.max(0,Number(input.value)||0);
 });
 saveData();
 updateMicronutrients();
 showMessage("Micronutrients saved successfully!");
}

function resetMicronutrients(){
 const d=getDay();
 Object.keys(microInfo).forEach(name=>d.micronutrients[name]=0);
 saveData();
 updateMicronutrients();
}

/* ---------- HELPERS ---------- */

function setText(id,value){
 const e=document.getElementById(id);
 if(e)e.textContent=value;
}

function updateProgress(id,value,target){
 const e=document.getElementById(id);
 if(!e||!target)return;
 const percent=Math.min(100,Math.max(0,(Number(value)/Number(target))*100));
 e.style.width=percent+"%";
}

function escapeHTML(value){
 return String(value)
 .replace(/&/g,"&amp;")
 .replace(/</g,"&lt;")
 .replace(/>/g,"&gt;")
 .replace(/"/g,"&quot;")
 .replace(/'/g,"&#039;");
}

/* ---------- REFRESH ---------- */

function refresh(){
 updateDate();
 loadProfile();
 renderFoods();
 updateNutrition();
 updateWater();
 updateMicronutrients();
 calculateHealthMetrics();
}

/* =====================================================
   PART 1 END
   PART 2 ISKO DIRECTLY CONTINUE KAREGA
===================================================== */
/* =====================================================
   NUTRITRACK - SCRIPT.JS
   PART 2
   Weight + Activity + Exercise + History + Reports
===================================================== */

/* ---------- WEIGHT TRACKER ---------- */

function addWeight(){
 const input=document.getElementById("weightInput");
 const timeEl=document.getElementById("weightTime");
 const value=Number(input?.value)||0;
 const time=timeEl?.value||"Morning";

 if(value<=0){
  showMessage("Please enter a valid weight.");
  return;
 }

 const entry={
  id:Date.now(),
  date:selectedDate,
  time:time,
  weight:value
 };

 appData.weights.push(entry);

 if(!appData.profile.currentWeight){
  appData.profile.currentWeight=value;
  const e=document.getElementById("currentWeight");
  if(e)e.value=value;
 }

 saveData();

 if(input)input.value="";

 renderWeights();
 updateGoal();
 calculateHealthMetrics();
 showMessage("Weight saved successfully!");
}

function deleteWeight(id){
 appData.weights=appData.weights.filter(w=>w.id!==id);
 saveData();
 renderWeights();
 updateGoal();
}

function renderWeights(){
 const history=document.getElementById("weightHistory");
 if(!history)return;

 const today=appData.weights.filter(w=>w.date===selectedDate);

 const morning=today.find(w=>w.time==="Morning");
 const evening=today.find(w=>w.time==="Evening");

 setText("morningWeight",morning?morning.weight+" kg":"--");
 setText("eveningWeight",evening?evening.weight+" kg":"--");

 const latest=appData.weights[appData.weights.length-1];
 setText("latestWeight",latest?latest.weight+" kg":"--");

 if(!appData.weights.length){
  history.innerHTML='<p class="food-info">No weight records yet.</p>';
  return;
 }

 history.innerHTML=`
  <div class="weight-row">
   <strong>Date</strong>
   <strong>Time</strong>
   <strong>Weight</strong>
   <strong>Action</strong>
  </div>`;

 [...appData.weights].reverse().forEach(w=>{
  history.innerHTML+=`
   <div class="weight-row">
    <span>${formatDate(w.date)}</span>
    <span>${escapeHTML(w.time)}</span>
    <span>${w.weight} kg</span>
    <button class="delete-food" onclick="deleteWeight(${w.id})">Delete</button>
   </div>`;
 });
}

/* ---------- GOAL ---------- */

function updateGoal(){
 const target=Number(appData.profile.targetWeight)||0;
 let current=Number(appData.profile.currentWeight)||0;

 if(appData.weights.length){
  current=Number(appData.weights[appData.weights.length-1].weight)||current;
 }

 setText("goalTargetWeight",target>0?target+" kg":"--");
 setText("goalCurrentWeight",current>0?current+" kg":"--");

 if(!current||!target){
  setText("goalProgressText","0%");
  updateProgress("goalProgress",0,100);
  return;
 }

 let start=Number(appData.startingWeight)||0;

 if(!start){
  start=current;
  appData.startingWeight=start;
  localStorage.setItem("nutriStartingWeight",start);
 }

 let percent=0;

 if(start>target){
  const total=start-target;
  percent=((start-current)/total)*100;
 }else if(start<target){
  const total=target-start;
  percent=((current-start)/total)*100;
 }else{
  percent=100;
 }

 percent=Math.min(100,Math.max(0,percent));

 setText("goalProgressText",Math.round(percent)+"%");
 updateProgress("goalProgress",percent,100);
}

/* ---------- ACTIVITY ---------- */

function saveActivity(){
 const d=getDay();

 d.activity.steps=Number(document.getElementById("steps")?.value)||0;
 d.activity.walking=Number(document.getElementById("walking")?.value)||0;
 d.activity.workout=Number(document.getElementById("workout")?.value)||0;

 saveData();
 updateActivity();
 showMessage("Activity saved successfully!");
}

function updateActivity(){
 const d=getDay();

 const steps=document.getElementById("steps");
 const walking=document.getElementById("walking");
 const workout=document.getElementById("workout");

 if(steps)steps.value=d.activity.steps||"";
 if(walking)walking.value=d.activity.walking||"";
 if(workout)workout.value=d.activity.workout||"";

 setText("reportSteps",d.activity.steps||0);
}

/* ---------- EXERCISE TRACKER ---------- */

function addExercise(){
 const nameInput=document.getElementById("exerciseName");
 const categoryInput=document.getElementById("exerciseCategory");
 const setsInput=document.getElementById("exerciseSets");
 const repsInput=document.getElementById("exerciseReps");

 const name=(nameInput?.value||"").trim();

 if(!name){
  showMessage("Please enter exercise name.");
  return;
 }

 const exercise={
  id:Date.now(),
  name:name,
  category:categoryInput?.value||"General",
  sets:Number(setsInput?.value)||0,
  reps:Number(repsInput?.value)||0
 };

 getDay().exercises.push(exercise);

 saveData();

 if(nameInput)nameInput.value="";
 if(setsInput)setsInput.value="";
 if(repsInput)repsInput.value="";

 renderExercises();
}

function deleteExercise(id){
 getDay().exercises=getDay().exercises.filter(e=>e.id!==id);
 saveData();
 renderExercises();
}

function renderExercises(){
 const box=document.getElementById("exerciseList");
 if(!box)return;

 const exercises=getDay().exercises;

 if(!exercises.length){
  box.innerHTML='<p class="food-info">No exercises added for this day.</p>';
  return;
 }

 box.innerHTML="";

 exercises.forEach(e=>{
  const item=document.createElement("div");
  item.className="food-item";

  item.innerHTML=`
   <div>
    <strong>${escapeHTML(e.name)}</strong>
    <span class="food-info">
     ${escapeHTML(e.category)}
     ${e.sets?" • "+e.sets+" sets":""}
     ${e.reps?" • "+e.reps+" reps":""}
    </span>
   </div>
   <button class="delete-food" onclick="deleteExercise(${e.id})">Delete</button>`;

  box.appendChild(item);
 });
}

/* ---------- DAILY DEFICIT ---------- */

function getDailyBurn(){
 const p=appData.profile;
 const bmr=calculateBMR(
  Number(p.age),
  Number(p.height),
  Number(p.currentWeight),
  p.gender
 );

 if(!bmr)return 0;

 return Math.round(
  bmr*(Number(p.activityLevel)||1.2)
 );
}

function getDailyDeficit(key){
 const intake=calculateNutrition(key).calories;

 const p=appData.profile;
 const bmr=calculateBMR(
  Number(p.age),
  Number(p.height),
  Number(p.currentWeight),
  p.gender
 );

 if(!bmr)return 0;

 const burn=Math.round(
  bmr*(Number(p.activityLevel)||1.2)
 );

 return burn-intake;
}

/* ---------- HISTORY ---------- */

function getLastDays(count){
 const result=[];
 const today=new Date(selectedDate+"T00:00:00");

 for(let i=count-1;i>=0;i--){
  const d=new Date(today);
  d.setDate(today.getDate()-i);

  result.push(getDateKey(d));
 }

 return result;
}

function renderHistory(){
 const box=document.getElementById("historyList");
 if(!box)return;

 const days=getLastDays(7);

 box.innerHTML=`
  <div class="history-row">
   <strong>Date</strong>
   <strong>Calories</strong>
   <strong>Burn</strong>
   <strong>Deficit</strong>
  </div>`;

 days.forEach(key=>{
  const calories=Math.round(calculateNutrition(key).calories);
  const burn=getDailyBurn();
  const deficit=burn-calories;

  box.innerHTML+=`
   <div class="history-row">
    <span>${formatDate(key)}</span>
    <span>${calories} kcal</span>
    <span>${burn?burn+" kcal":"--"}</span>
    <span>${burn?deficit+" kcal":"--"}</span>
   </div>`;
 });
}

/* ---------- WEEKLY GRAPH ---------- */

function renderWeeklyGraph(){
 const canvas=document.getElementById("weeklyChart");
 if(!canvas)return;

 const ctx=canvas.getContext("2d");
 const days=getLastDays(7);

 const calories=days.map(d=>
  Math.round(calculateNutrition(d).calories)
 );

 const burn=days.map(()=>
  getDailyBurn()
 );

 const max=Math.max(
  1000,
  ...calories,
  ...burn
 );

 ctx.clearRect(0,0,canvas.width,canvas.height);

 const padding=45;
 const width=canvas.width-padding*2;
 const height=canvas.height-padding*2;

 ctx.strokeStyle="#d1d5db";
 ctx.lineWidth=1;

 ctx.beginPath();
 ctx.moveTo(padding,padding);
 ctx.lineTo(padding,padding+height);
 ctx.lineTo(padding+width,padding+height);
 ctx.stroke();

 const step=width/6;

 calories.forEach((value,i)=>{
  const x=padding+i*step;
  const y=padding+height-(value/max)*height;

  ctx.fillStyle="#16a34a";
  ctx.beginPath();
  ctx.arc(x,y,5,0,Math.PI*2);
  ctx.fill();

  if(i>0){
   const old=calories[i-1];
   const ox=padding+(i-1)*step;
   const oy=padding+height-(old/max)*height;

   ctx.strokeStyle="#16a34a";
   ctx.lineWidth=2;
   ctx.beginPath();
   ctx.moveTo(ox,oy);
   ctx.lineTo(x,y);
   ctx.stroke();
  }

  ctx.fillStyle="#374151";
  ctx.font="11px Arial";
  ctx.textAlign="center";

  const short=days[i].slice(5);
  ctx.fillText(short,x,canvas.height-18);
 });

 burn.forEach((value,i)=>{
  const x=padding+i*step;
  const y=padding+height-(value/max)*height;

  ctx.fillStyle="#ef4444";
  ctx.beginPath();
  ctx.arc(x,y,4,0,Math.PI*2);
  ctx.fill();

  if(i>0){
   const old=burn[i-1];
   const ox=padding+(i-1)*step;
   const oy=padding+height-(old/max)*height;

   ctx.strokeStyle="#ef4444";
   ctx.lineWidth=2;
   ctx.beginPath();
   ctx.moveTo(ox,oy);
   ctx.lineTo(x,y);
   ctx.stroke();
  }
 });
}

/* ---------- DAILY REPORT ---------- */

function prepareDailyReport(){
 const n=calculateNutrition();

 setText("reportDate",formatDate(selectedDate));
 setText("reportCalories",Math.round(n.calories)+" kcal");
 setText("reportProtein",n.protein.toFixed(1)+" g");
 setText("reportCarbs",n.carbs.toFixed(1)+" g");
 setText("reportFat",n.fat.toFixed(1)+" g");
 setText("reportWater",getDay().water+" ml");
 setText("reportDeficit",getDailyDeficit(selectedDate)+" kcal");
 setText("reportWeight",getDayWeight(selectedDate));

 updateActivity();
 updateMicronutrients();
}

function getDayWeight(key){
 const list=appData.weights.filter(w=>w.date===key);
 if(!list.length)return"--";
 return list[list.length-1].weight+" kg";
}

/* ---------- PRINT DAILY ---------- */

function printDailyReport(){
 prepareDailyReport();

 const n=calculateNutrition();
 const d=getDay();
 const burn=getDailyBurn();
 const deficit=burn?burn-n.calories:0;

 const html=`
  <html>
  <head>
   <title>NutriTrack Daily Report</title>
   <style>
    body{font-family:Arial;padding:30px;color:#17201a}
    h1{color:#16a34a}
    .box{border:1px solid #ddd;padding:15px;margin:12px 0;border-radius:10px}
    table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ddd;padding:8px;text-align:left}
   </style>
  </head>
  <body>
   <h1>NutriTrack - Daily Report</h1>
   <p><b>Date:</b> ${formatDate(selectedDate)}</p>

   <div class="box">
    <h2>Nutrition</h2>
    <table>
     <tr><th>Calories</th><td>${Math.round(n.calories)} kcal</td></tr>
     <tr><th>Protein</th><td>${n.protein.toFixed(1)} g</td></tr>
     <tr><th>Carbs</th><td>${n.carbs.toFixed(1)} g</td></tr>
     <tr><th>Fat</th><td>${n.fat.toFixed(1)} g</td></tr>
     <tr><th>Fiber</th><td>${n.fiber.toFixed(1)} g</td></tr>
    </table>
   </div>

   <div class="box">
    <h2>Water & Energy</h2>
    <p>Water: ${d.water} ml</p>
    <p>Estimated Burn: ${burn||"--"} kcal</p>
    <p>Deficit/Surplus: ${burn?deficit:"--"} kcal</p>
    <p>Weight: ${getDayWeight(selectedDate)}</p>
   </div>

   <div class="box">
    <h2>Activity</h2>
    <p>Steps: ${d.activity.steps||0}</p>
    <p>Walking: ${d.activity.walking||0} min</p>
    <p>Workout: ${d.activity.workout||0} min</p>
   </div>

   <div class="box">
    <h2>Exercises</h2>
    ${d.exercises.length?d.exercises.map(e=>`<p>• ${escapeHTML(e.name)} — ${escapeHTML(e.category)}</p>`).join(""):"<p>No exercises recorded.</p>"}
   </div>
  </body>
  </html>`;

 const win=window.open("","_blank");
 if(!win){
  showMessage("Please allow pop-ups for printing.");
  return;
 }

 win.document.write(html);
 win.document.close();
 win.focus();

 setTimeout(()=>win.print(),400);
}

/* ---------- WEEKLY REPORT PRINT ---------- */

function printWeeklyReport(){
 const days=getLastDays(7);

 let rows="";
 let totalCalories=0;
 let totalDeficit=0;

 days.forEach(key=>{
  const calories=Math.round(calculateNutrition(key).calories);
  const burn=getDailyBurn();
  const deficit=burn?burn-calories:0;

  totalCalories+=calories;
  totalDeficit+=deficit;

  rows+=`
   <tr>
    <td>${formatDate(key)}</td>
    <td>${calories} kcal</td>
    <td>${burn?burn+" kcal":"--"}</td>
    <td>${burn?deficit+" kcal":"--"}</td>
    <td>${getDayWeight(key)}</td>
   </tr>`;
 });

 const html=`
  <html>
  <head>
   <title>NutriTrack Weekly Report</title>
   <style>
    body{font-family:Arial;padding:30px;color:#17201a}
    h1{color:#16a34a}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th,td{border:1px solid #ddd;padding:9px;text-align:left}
    th{background:#ecfdf5}
    .summary{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}
    .box{border:1px solid #ddd;border-radius:10px;padding:15px}
   </style>
  </head>
  <body>
   <h1>NutriTrack - Weekly Report</h1>
   <p>Last 7 days ending ${formatDate(selectedDate)}</p>

   <div class="summary">
    <div class="box"><b>Total Calories</b><br>${totalCalories} kcal</div>
    <div class="box"><b>Average Calories</b><br>${Math.round(totalCalories/7)} kcal/day</div>
    <div class="box"><b>Total Deficit</b><br>${totalDeficit} kcal</div>
   </div>

   <table>
    <tr>
     <th>Date</th>
     <th>Calories</th>
     <th>Estimated Burn</th>
     <th>Deficit / Surplus</th>
     <th>Weight</th>
    </tr>
    ${rows}
   </table>
  </body>
  </html>`;

 const win=window.open("","_blank");

 if(!win){
  showMessage("Please allow pop-ups for printing.");
  return;
 }

 win.document.write(html);
 win.document.close();
 win.focus();

 setTimeout(()=>win.print(),400);
}

/* ---------- RESET SELECTED DAY ---------- */

function resetToday(){
 if(!confirm("Delete all data for "+formatDate(selectedDate)+"?"))return;

 delete appData.days[selectedDate];

 saveData();
 getDay(selectedDate);
 refresh();

 showMessage("Selected day has been reset.");
}

/* ---------- FULL REFRESH ---------- */

function refresh(){
 updateDate();
 renderFoods();
 updateNutrition();
 updateWater();
 updateMicronutrients();
 renderWeights();
 updateGoal();
 updateActivity();
 renderExercises();
 calculateHealthMetrics();
 renderHistory();
 renderWeeklyGraph();
 prepareDailyReport();
}

/* ---------- INITIALIZE ---------- */

function initializeApp(){
 loadProfile();
 getDay(selectedDate);
 refresh();
}

initializeApp();