import json,os,sys,subprocess
import cv2
from PIL import Image
L=json.load(open('raw/lists_all.json'))
home=open('/workspace/msq.html').read()
det=cv2.QRCodeDetector()
def decode(p):
    im=cv2.imread(p)
    if im is None: return None
    v,_,_=det.detectAndDecode(im)
    if v: return v
    for sc in (1.5,0.5,2):
        im2=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
        im2=cv2.copyMakeBorder(im2,40,40,40,40,cv2.BORDER_CONSTANT,value=(255,255,255))
        v,_,_=det.detectAndDecode(im2)
        if v: return v
    return None
out={'source':'https://mystationqr.com/','states':[]}
issues=[];tot=0
for sl in sorted(L,key=lambda k:L[k]['name']):
    sts=[]
    for s in sorted(L[sl]['stations'],key=lambda x:x['name'].lower()):
        mf=f"raw/meta/{s['id']}.json"
        qr=None;payload=None;note=None
        if os.path.exists(mf):
            m=json.load(open(mf))
            f=m.get('_file')
            if f and os.path.exists(f):
                try:
                    Image.open(f).verify()
                    qr=f; payload=decode(f)
                    if payload is None: note='payload not decodable'
                except Exception as e:
                    note='invalid image'; issues.append((sl,s['code'],note))
            else:
                note='no QR returned'; issues.append((sl,s['code'],note))
        else:
            note='not fetched'; issues.append((sl,s['code'],note))
        d={'name':s['name'],'code':s['code'],'city':s.get('city'),'zone':s.get('zone'),'address':s.get('address'),'source_slug':s['slug'],'qr':qr,'payload':payload}
        sts.append(d)
    out['states'].append({'slug':sl,'name':L[sl]['name'],'count':len(sts),'stations':sts})
    tot+=len(sts)
os.makedirs('data',exist_ok=True)
json.dump(out,open('data/stations.json','w'),separators=(',',':'),ensure_ascii=False)
print('total',tot)
for s in out['states']:
    print(s['slug'],s['count'],sum(1 for x in s['stations'] if x['qr']),sum(1 for x in s['stations'] if x['payload']))
print('issues',issues)
