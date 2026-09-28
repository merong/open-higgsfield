"""WOFF2 compression only. Preserve every SFNT table except required head flags/checksum.
No glyph removal, shaping changes, instancing, renaming, or WOFF metadata injection.
"""
from pathlib import Path
import io,json,hashlib,concurrent.futures
from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import WOFF2Writer, WOFF2FlavorData, getKnownTagIndex
from fontTools.misc.textTools import Tag
from fontTools.ttLib.sfnt import SFNTReader
ROOT=Path(__file__).resolve().parents[2];path=ROOT/'src/projects/font-catalog.json';manifest=json.loads(path.read_text())
class PreservingWriter(WOFF2Writer):
 def __setitem__(self,tag,data):
  if tag!='DSIG':return super().__setitem__(tag,data)
  # Upstream IBM files contain an empty DSIG table. Keep its exact bytes.
  assert len(data)==8 and int.from_bytes(data[4:6],'big')==0
  entry=self.DirectoryEntry();entry.tag=Tag(tag);entry.flags=getKnownTagIndex(entry.tag);entry.data=data;self.tables[tag]=entry

def wrap(face):
 if face['format']!='truetype':return face
 source=ROOT/'public'/face['path'].lstrip('/'); data=source.read_bytes(); target=io.BytesIO()
 reader=SFNTReader(io.BytesIO(data)); writer=PreservingWriter(target,len(reader.keys()),sfntVersion=reader.sfntVersion,flavorData=WOFF2FlavorData(transformedTables=set()))
 for tag in reader.keys():writer[tag]=reader[tag]
 writer.close();compressed=target.getvalue()
 before=TTFont(io.BytesIO(data),lazy=True);after=TTFont(io.BytesIO(compressed),lazy=True)
 assert set(before.reader.keys())==set(after.reader.keys()), (face['path'],list(before.reader.keys()),list(after.reader.keys()))
 for tag in before.reader.keys():
  a=before.reader[tag];b=after.reader[tag]
  if tag=='head':
   # WOFF2 encoder sets bit 11 in head.flags and recomputes checkSumAdjustment.
   assert a[:8]==b[:8] and a[12:16]==b[12:16] and a[18:]==b[18:]
   assert int.from_bytes(a[16:18],'big')|0x800==int.from_bytes(b[16:18],'big')
  else:assert a==b,(face['path'],tag)
 destination=source.with_suffix('.woff2');destination.write_bytes(compressed)
 updated={**face,'sourceSha256':face['sha256'],'sourceBytes':face['bytes'],'path':face['path'][:-4]+'.woff2','format':'woff2','bytes':len(compressed),'sha256':hashlib.sha256(compressed).hexdigest(),'packaging':'WOFF2 compression only; all SFNT tables unchanged except head checksum and compression flag'}

 return updated
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for font in manifest['fonts']:font['faces']=list(pool.map(wrap,font['faces']))
for out in [path,ROOT/'public/fonts/catalog/manifest.json']:out.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'bytes':sum(f['bytes'] for font in manifest['fonts'] for f in font['faces']),'families':len(manifest['fonts'])}))

# Retire only this script's TTF inputs after the complete manifest is committed.
for font in manifest['fonts']:
 for face in font['faces']:
  if face.get('packaging'):(ROOT/'public'/face['path'].lstrip('/')).with_suffix('.ttf').unlink(missing_ok=True)
