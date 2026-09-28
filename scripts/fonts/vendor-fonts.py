"""Fetch unmodified, revision-pinned official fonts and record their real cmap/axes.
Requires Python fontTools for inspection only; downloads use system curl certificates.
"""
import concurrent.futures, hashlib, io, json, subprocess
from pathlib import Path
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/fonts/catalog'; OUT.mkdir(parents=True,exist_ok=True)
GF='e44c4b011a820c2cbe2fd2cfa8052037d7edb571'
SUIT='55118d981336d8fce005eb62888c12c0568ef7b0'
FAMILIES=[('noto-sans-kr','Noto Sans KR','notosanskr','ko'),('ibm-plex-sans-kr','IBM Plex Sans KR','ibmplexsanskr','ko'),('nanum-gothic','Nanum Gothic','nanumgothic','ko'),('noto-serif-kr','Noto Serif KR','notoserifkr','ko'),('nanum-myeongjo','Nanum Myeongjo','nanummyeongjo','ko'),('gowun-batang','Gowun Batang','gowunbatang','ko'),('black-han-sans','Black Han Sans','blackhansans','ko'),('do-hyeon','Do Hyeon','dohyeon','ko'),('inter','Inter','inter','en'),('dm-sans','DM Sans','dmsans','en'),('manrope','Manrope','manrope','en'),('montserrat','Montserrat','montserrat','en'),('poppins','Poppins','poppins','en'),('space-grotesk','Space Grotesk','spacegrotesk','en'),('playfair-display','Playfair Display','playfairdisplay','en'),('cormorant-garamond','Cormorant Garamond','cormorantgaramond','en'),('bebas-neue','Bebas Neue','bebasneue','en'),('jetbrains-mono','JetBrains Mono','jetbrainsmono','en')]
def fetch(url): return subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--retry','2',url])
def ranges(points):
 result=[]
 for p in sorted(points):
  if result and p==result[-1][1]+1: result[-1][1]=p
  else: result.append([p,p])
 return result
def inspect(data,path,source):
 font=TTFont(io.BytesIO(data)); weights=[int(font['OS/2'].usWeightClass)]
 axes=[]
 if 'fvar' in font:
  axes=[{'tag':a.axisTag,'min':a.minValue,'max':a.maxValue,'default':a.defaultValue} for a in font['fvar'].axes]
  for a in axes:
   if a['tag']=='wght': weights=list(range(int(a['min'])//100*100, int(a['max'])+1,100)); weights=[w for w in weights if a['min']<=w<=a['max']]
 cmap=font.getBestCmap()
 return {'path':path,'source':source,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'format':'woff2' if data[:4]==b'wOF2' else 'truetype','weights':weights,'variable':any(a['tag']=='wght' for a in axes),'axes':axes,'version':font['name'].getDebugName(5),'coverage':ranges(p for p,g in cmap.items() if g!='.notdef')}
def google(item):
 id,name,folder,language=item
 base=f'https://raw.githubusercontent.com/google/fonts/{GF}/ofl/{folder}/'
 entries=json.loads(fetch(f'https://api.github.com/repos/google/fonts/contents/ofl/{folder}?ref={GF}'))
 names=[e['name'] for e in entries if e['name'].endswith('.ttf') and 'Italic' not in e['name'] and 'ital,' not in e['name']]
 variable=[n for n in names if '[' in n]
 names=variable or [n for n in names if any(n.endswith('-'+w+'.ttf') for w in ['Regular','Medium','SemiBold','Bold','ExtraBold'])]
 assert names,(id,entries)
 directory=OUT/id;directory.mkdir(exist_ok=True);faces=[]
 for n in names:
  url=base+__import__('urllib.parse',fromlist=['quote']).quote(n);data=fetch(url);(directory/n).write_bytes(data)
  faces.append(inspect(data,f'/fonts/catalog/{id}/{n}',url))
 license=fetch(base+'OFL.txt'); assert b'SIL OPEN FONT LICENSE' in license
 (directory/'OFL.txt').write_bytes(license)
 return {'id':id,'name':name,'family':'OHF '+name,'language':language,'source':f'https://github.com/google/fonts/tree/{GF}/ofl/{folder}','revision':GF,'license':'OFL-1.1','licensePath':f'/fonts/catalog/{id}/OFL.txt','licenseUrl':base+'OFL.txt','licenseSha256':hashlib.sha256(license).hexdigest(),'checkedAt':'2026-09-21','faces':faces}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: fonts=list(pool.map(google,FAMILIES))
for id,name,language,src,licenseurl in [
 ('suit','SUIT','ko',f'https://raw.githubusercontent.com/sun-typeface/SUIT/{SUIT}/fonts/variable/woff2/SUIT-Variable.woff2',f'https://raw.githubusercontent.com/sun-typeface/SUIT/{SUIT}/LICENSE'),
 ('pretendard','Pretendard','ko','https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2','https://raw.githubusercontent.com/orioncactus/pretendard/v1.3.9/LICENSE')]:
 directory=OUT/id; directory.mkdir(exist_ok=True)
 data=fetch(src); (directory/'font.woff2').write_bytes(data); license=fetch(licenseurl); assert b'SIL OPEN FONT LICENSE' in license
 (directory/'OFL.txt').write_bytes(license)
 fonts.append({'id':id,'name':name,'family':'OHF '+name,'language':language,'source':src,'revision':SUIT if id=='suit' else 'v1.3.9','license':'OFL-1.1','licensePath':f'/fonts/catalog/{id}/OFL.txt','licenseUrl':licenseurl,'licenseSha256':hashlib.sha256(license).hexdigest(),'checkedAt':'2026-09-21','faces':[inspect(data,f'/fonts/catalog/{id}/font.woff2',src)]})
manifest={'version':1,'fonts':fonts}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
(ROOT/'src/projects/font-catalog.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'families':len(fonts),'bytes':sum(f['bytes'] for font in fonts for f in font['faces']),'faces':sum(len(f['faces']) for f in fonts)},indent=2))
