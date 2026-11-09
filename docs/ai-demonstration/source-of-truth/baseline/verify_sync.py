#!/usr/bin/env python3
"""Fail-closed integrity and timing gate; semantic review is external evidence."""
import hashlib,json,sys,math
from pathlib import Path

def verify(m,base):
 errors=[]
 def need(ok,msg):
  if not ok: errors.append(msg)
 def evidence(row,label):
  try:
   p=(base/row['path']).resolve();need(p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'],label+': missing or changed evidence')
  except (KeyError,OSError,TypeError): errors.append(label+': missing evidence')
 need(m.get('schema')==1,'schema must be 1')
 evidence(m.get('artifact',{}),'artifact')
 fps=m.get('fps',0);need(isinstance(fps,(int,float)) and math.isfinite(fps) and fps>0,'invalid fps')
 need(m.get('singleTimeline') is True,'shared timeline absent')
 need(m.get('ownerRejected') is False,'owner acceptance unresolved or rejected')
 need(m.get('captureMotionQualified') is True,'capture motion needs recapture or qualification')
 anchors=m.get('anchors',[]);need(bool(anchors),'no action anchors')
 for a in anchors:
  try:
   need(abs(a['spokenWordFrame']-a['visibleActionFrame'])<=fps*.25,a['id']+': action drift exceeds 250 ms')
   need(a.get('reviewedInFinal') is True,a['id']+': final action review absent');evidence(a.get('evidence',{}),a['id'])
  except (KeyError,TypeError):errors.append('invalid anchor')
 speech=sorted(m.get('speech',[]),key=lambda c:c.get('startFrame',-1));need(bool(speech),'no measured speech')
 end=-1
 for c in speech:
  try:
   need(c['startFrame']>=end and c['endFrame']>c['startFrame'],'speech overlaps or invalid range');need(c['measuredSamples']>0 and c['sampleRate']>0,'unmeasured audio');need(abs((c['endFrame']-c['startFrame'])/fps-c['measuredSamples']/c['sampleRate'])<=1/fps,'speech duration differs from actual clip');end=c['endFrame']
  except (KeyError,TypeError,ZeroDivisionError):errors.append('invalid speech measurement')
 need(m.get('activeTypingMeasured') is True,'active typing not measured')
 for s in m.get('typingStalls',[]):
  need(s.get('seconds',float('inf'))<=.75,'active typing stall exceeds 750 ms')
 need(bool(m.get('reading',[])),'reading windows absent')
 for r in m.get('reading',[]):
  try:need((r['endFrame']-r['startFrame'])/fps>=max(3,r['words']/3),'reading window too short')
  except (KeyError,TypeError,ZeroDivisionError):errors.append('invalid reading window')
 playback=m.get('playback',{});evidence(playback,'playback')
 try:
  live=json.loads((base/playback['path']).read_text());events=live['evidence']['events']
  need(live['ended'] is True and live['muted'] is False and live['rate']==1,'full unmuted 1x playback incomplete')
  need(not any(e['event'] in ['waiting','stalled','error','seeking'] for e in events),'playback contains stall/error/seek')
  need(sum(e['event']=='play' for e in events)==1,'unexpected replay')
 except (KeyError,OSError,TypeError,ValueError):errors.append('invalid playback receipt')
 for label in ['privacyReview','independentWatchListen']:evidence(m.get(label,{}),label)
 return {'status':'HOLD' if errors else 'MEASUREMENTS-PASS-RELEASE-NOT-AUTHORISED','errors':errors,'semanticLimit':'Evidence integrity is checked; visual meaning and owner acceptance require real reviewers.'}
if __name__=='__main__':
 try:
  p=Path(sys.argv[1]);result=verify(json.loads(p.read_text()),p.parent)
 except (IndexError,OSError,ValueError,TypeError) as e:result={'status':'HOLD','errors':['missing or invalid manifest: '+str(e)]}
 print(json.dumps(result,indent=2));sys.exit(0 if not result['errors'] else 1)
