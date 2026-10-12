"""Rebuild with fonttools[woff]==4.60.2; committed WOFF2 files need no Python in CI."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

source = Path("assets/fonts/Archivo-variable.ttf")
used = {ord(char) for folder in ("src", "shared") for file in Path(folder).rglob("*")
        if file.suffix in (".ts", ".tsx", ".css") for char in file.read_text()}
# Latin-1, French ligatures, punctuation, and every supported UI character.
characters = set(range(0x20, 0x100)) | set(range(0x2000, 0x2070)) | {0x152, 0x153, 0x178, 0x20AC, 0x2212} | used
for filename, axes in (
    ("Archivo-display-fr.woff2", {"wght": 900, "wdth": 75}),
    ("Archivo-ui-fr.woff2", {"wght": (600, 900), "wdth": 100}),
):
    font = instantiateVariableFont(TTFont(source), axes, inplace=True)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(Path("public/fonts") / filename)
    print(filename, (Path("public/fonts") / filename).stat().st_size)
