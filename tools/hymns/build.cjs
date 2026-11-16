// Chord overrides fix spots where the derived chord clashed with a main melody note.
const {CFG,convert}=require('./songs.cjs');
const META={
 hark:{title:'Hark! The Herald Angels Sing',meta:'Felix Mendelssohn, 1840',level:'Medium',bpm:100,
   lhAll:'G | G:3 D:1 | G:2 D7:2 | G:1 D:1 G:2 | G | G:3 D:1 | D | D:1 A7:1 D:2 | D:2 G:2 | C:1 G:2 D:1 | D:2 G:2 | C:1 G:2 D:1 | C | C:2 Am:2 | D7:2 G:2 | G:1 D:1 G:2 | C | C:2 Am:2 | D7:2 G:2 | G:1 D7:1 G:2'},
 adeste:{title:'O Come, All Ye Faithful',meta:'John Francis Wade, c. 1743',level:'Medium',bpm:100,fix:{2:'D:4',11:'D:1 G:2 D:1'}},
 noel:{title:'The First Noel',meta:'Traditional English',level:'Easy',bpm:112},
 stlouis:{title:'O Little Town of Bethlehem',meta:'Lewis H. Redner, 1868',level:'Medium',bpm:92,fix:{6:'D7:2 Am:2',7:'G:3 D7:1',11:'Em:2 D7:2',14:'D7:2 C:2'}},
 away:{title:'Away in a Manger',meta:'William J. Kirkpatrick, 1895',level:'Easy',bpm:96,fix:{11:'G:3',15:'D7:3'}},
 angels:{title:'Angels We Have Heard on High',meta:'Traditional French',level:'Medium',bpm:100},
 godrest:{title:'God Rest Ye Merry, Gentlemen',meta:'Traditional English',level:'Medium',bpm:132,fix:{10:'G:2 Em:2',14:'Em:3 B7:1',16:'D:2 Em:1 D:1',18:'Em:3 B7:1'}},
 greens:{title:'What Child Is This?',meta:'Greensleeves, traditional English',level:'Medium',bpm:100},
 kings:{title:'We Three Kings',meta:'John Henry Hopkins Jr., 1857',level:'Easy',bpm:126},
 itcame:{title:'It Came Upon the Midnight Clear',meta:'Richard Storrs Willis, 1850',level:'Easy',bpm:108,fix:{2:'D:1 C:2',10:'D:1 C:2',26:'D:1 C:2'}},
 emm:{title:'O Come, O Come, Emmanuel',meta:'Plainsong, arr. Thomas Helmore, 1856',level:'Easy',bpm:92,fix:{5:'Am:2 Em:1 D:1',18:'Am:2 Em:1 D:1'}},
 joy:{fix:{2:'C:1 G7:1',17:'C:1 G7:1'}},
 silent:{},
};
const out={};
for(const [k,m] of Object.entries(META)){
  const c=CFG[k];const r=convert(c);let lh=m.lhAll||r.lh;
  if(m.fix){const bars=lh.split(' | ');for(const [i,v] of Object.entries(m.fix))bars[i]=v;lh=bars.join(' | ');}
  out[k]={id:k,title:m.title,meta:m.meta,level:m.level,key:c.key,bpm:m.bpm,time:r.time,pickup:r.pickup,rh:r.rh,lh};
}
require('fs').writeFileSync('built.json',JSON.stringify(out,null,1));
// built.json holds the right-hand and left-hand strings pasted into SONGS in src/index.html.
console.log(Object.keys(out).join(' '));
