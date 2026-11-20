import json,subprocess,time,base64,os,sys
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
L=json.load(open('raw/lists.json'))
L['jammu-and-kashmir']={'name':'Jammu and Kashmir','stations':json.load(open('raw/jk.json'))}

os.makedirs('qr',exist_ok=True); os.makedirs('raw/meta',exist_ok=True)
items=[(sl,s) for sl,v in L.items() for s in v['stations']]
K=int(sys.argv[1]);N=int(sys.argv[2])
items=[x for i,x in enumerate(items) if i%N==K]
print(len(items),flush=True)
fails=[]
for n,(sl,s) in enumerate(items):
    d=f"qr/{sl}"; os.makedirs(d,exist_ok=True)
    fn=f"{d}/{s['id']}.png"
    mf=f"raw/meta/{s['id']}.json"
    if os.path.exists(mf): continue
    body=json.dumps({'slug':s['slug']})
    for att in range(3):
        r=subprocess.run(['curl','-s','-m','30','-A',UA,'-H','Content-Type: application/json','-H','Origin: https://mystationqr.com','-H',f"Referer: https://mystationqr.com/station/{s['slug']}",'-d',body,'-w','\n%{http_code}','https://mystationqr.com/api/station-qr'],capture_output=True,text=True)
        txt,_,code=r.stdout.rpartition('\n')
        if code=='200': break
        time.sleep(2*(att+1))
    try:
        j=json.loads(txt); dat=j['data']
        img=dat.pop('image_data',None)
        if img:
            open(fn,'wb').write(base64.b64decode(img))
        dat['_file']=fn if img else None
        dat['_http']=code
        json.dump(dat,open(mf,'w'))
    except Exception as e:
        fails.append((sl,s['id'],s['slug'],code)); print('FAIL',sl,s['slug'],code,flush=True)
        open('raw/fails.log','a').write(f"{sl} {s['id']} {s['slug']} {code} {txt[:200]!r}\n")
    if n%100==0: print(n,flush=True)
    time.sleep(0.35)
print('done',len(fails))
