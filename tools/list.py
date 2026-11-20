import re,json,subprocess,time
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
slugs="andhra-pradesh arunachal-pradesh assam bihar chhattisgarh goa gujarat haryana himachal-pradesh jammu-and-kashmir jharkhand karnataka kerala madhya-pradesh maharashtra nagaland nct-of-delhi odisha puducherry punjab rajasthan tamil-nadu tripura uttar-pradesh uttarakhand west-bengal".split()
out={}
for sl in slugs:
    h=subprocess.run(['curl','-s','-A',UA,f'https://mystationqr.com/states/{sl}'],capture_output=True,text=True).stdout
    open(f'raw/{sl}.html','w').write(h)
    i=h.find('\\"allStations\\":[')
    if i<0: print('NO',sl);continue
    j=i+len('\\"allStations\\":')
    s=h[j:]
    # unescape the JS string chunk
    s=s.replace('\\"','"').replace('\\\\','\\')
    dec=json.JSONDecoder()
    arr,_=dec.raw_decode(s)
    sn=re.search(r'"stateName\\?":\\?"([^"\\]+)',h)
    out[sl]={'name':sn.group(1) if sn else sl,'stations':arr}
    print(sl,out[sl]['name'],len(arr),set(a['pop_status'] for a in arr))
    time.sleep(0.4)
json.dump(out,open('raw/lists.json','w'))
print(sum(len(v['stations']) for v in out.values()))
