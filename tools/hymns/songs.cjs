const {convert}=require('./convert.cjs');
// Clone the two source collections and point these at them:
//   git clone https://github.com/magdalenesacredmusic/English-Hymns
//   git clone https://github.com/benkuhn/carols
const M=(process.env.HYMNS_DIR||'English-Hymns')+'/', B=(process.env.CAROLS_DIR||'carols')+'/carols/';
const BK={s:'sop',a:'alto',t:'tenor',b:'bass'};
const CFG={
 hark:{file:M+'D-H/Hark! The Herald Angels Sing (MENDELSSOHN).ly',key:'G'},
 adeste:{file:M+'O/O Come All Ye Faithful (ADESTE FIDELIS).ly',key:'G'},
 noel:{file:M+'T-Z/The First Nowell (THE FIRST NOWELL).ly',key:'C',transpose:-2},
 away:{file:M+'A-C/Away in a Manger (CRADLE SONG).ly',key:'G',transpose:2},
 angels:{file:M+'A-C/Angels We Have Heard On High (GLORIA).ly',key:'G',transpose:2},
 stlouis:{file:M+'O/O Little Town of Bethlehem (ST. LOUIS).ly',key:'G'},
 greens:{file:M+'T-Z/What Child is This (GREENSLEEVES).ly',key:'Em'},
 godrest:{file:M+'D-H/God Rest Ye Merry, Gentlemen (GOD REST YE MERRY).ly',key:'Em'},
 kings:{file:M+'T-Z/We three kings (KINGS OF ORIENT).ly',key:'Em',timeScale:2,time:[3,4]},
 emm:{file:M+'O/O Come, O Come Emmanuel (VENI, VENI, EMMANUEL - metered).ly',key:'Em'},
 itcame:{file:B+'it_came.ly',voices:BK,key:'G',transpose:-2,time:[3,4]},
 joy:{file:M+'I-N/Joy to the World (ANTIOCH).ly',key:'C',transpose:-2},
 silent:{file:M+'P-S/Silent Night! (STILLE NACHT).ly',key:'C',transpose:2,time:[3,4]},
 goodking:{file:B+'good_king.ly',voices:BK,key:'G',transpose:-1},
};
module.exports={CFG,convert};
if(require.main===module){
 const which=process.argv.slice(2);
 for(const k of (which.length?which:Object.keys(CFG))){
  try{const r=convert(CFG[k]);
   console.log('#### '+k,JSON.stringify(r.time),'pickup',r.pickup,'len',r.length,'range',r.range.join('-'));
   const rb=r.rh.split(' | '),lb=r.lh.split(' | ');
   for(let i=0;i<Math.max(rb.length,lb.length);i++)console.log(String(i).padStart(2),(rb[i]||'').padEnd(52),'||',lb[i]||'');
  }catch(e){console.log('#### '+k+' ERR '+e.stack);}
 }}
