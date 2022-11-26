
var NESToolState = {
	dialogOpen: false,
	chosenAction: null,
	chosenIndex: null, 
	image: null,
	tileset: null,
	bytes: null
}

// NES Hardware palette

const NES_HW_PAL = 
[
	'#757575',
	'#8f1b27',
	'#ab0000',
	'#9f0047',
	'#77008f',
	'#1300ab',
	'#0000a7',
	'#000b7f',
	'#002f43',
	'#004700',
	'#005100',
	'#173f00',
	'#5f3f1b',
	'#000000',
	'#000000',
	'#000000',
	'#bcbcbc',
	'#ef7300',
	'#ef3b23',
	'#f30083',
	'#bf00bf',
	'#5b00e7',
	'#002bdb',
	'#0f4fcb',
	'#00738b',
	'#009700',
	'#00ab00',
	'#3b9300',
	'#8b8300',
	'#000000',
	'#000000',
	'#000000',
	'#ffffff',
	'#ffbf3f',
	'#ff975f',
	'#fd8ba7',
	'#ff7bf7',
	'#b777ff',
	'#6377ff',
	'#3b9bff',
	'#3fbff3',
	'#13d383',
	'#4bdf4f',
	'#98f858',
	'#dbeb00',
	'#000000',
	'#000000',
	'#000000',
	'#ffffff',
	'#ffe7ab',
	'#ffd7c7',
	'#ffcbd7',
	'#ffc7ff',
	'#dbc7ff',
	'#b3bfff',
	'#abdbff',
	'#a3e7ff',
	'#a3ffe3',
	'#bff3ab',
	'#cfffb3',
	'#f3ff9f',
	'#000000',
	'#000000',
	'#000000'
]

//	active palette
const PALETTE =
[
	'#000000',
	'#005100',
	'#bcbcbc',
	'#ffffff',
	'#000000',
	'#8f1b27',
	'#ffbf3f',
	'#ffe7ab',
	'#000000',
	'#0000a7',
	'#002bdb',
	'#6377ff',
	'#000000',
	'#004700',
	'#009700',
	'#13d383',
];

//	for finding nearest color
// from https://stackoverflow.com/a/5624139
function hexToRgb(hex) {
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Distance between 2 colors (in RGB)
// https://stackoverflow.com/questions/23990802/find-nearest-color-from-a-colors-list
function distance(a, b) {
    return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2));
}

// return nearest color from array
function nearestColor(colorHex){
  var lowest = Number.POSITIVE_INFINITY;
  var tmp;
  let index = 0;
  NES_HW_PAL.forEach( (el, i) => {
      tmp = distance(hexToRgb(colorHex), hexToRgb(el))
      if (tmp < lowest) {
        lowest = tmp;
        index = i;
      };
      
  })
  return NES_HW_PAL[index];
}

//	update tileset with new data, either colors or tiles

function CHR_repaint()
{
	if (NESToolState.bytes==null) return

	//	creat image if needed
	if (NESToolState.image==null)
	{
		tiled.log("new image")
    NESToolState.image = new Image(128, 128*4, Image.Format_Indexed8);
	}
	//	set the palette
	NESToolState.image.setColorTable(PALETTE);
	//	set the tile data 
	for (let n = 0; n < 256; n++)
	{
		let offset = Math.floor(n * 16)
		let x = Math.floor(n % 16) * 8 
		let y = Math.floor(n / 16) * 8 
		for(let j = 0; j < 8; j++)
		{
			let a = NESToolState.bytes[offset+j]
			let b = NESToolState.bytes[8+offset+j]
			for(let i = 0; i < 8; i++)
			{
				let ix=7-i
				let c = (a>>ix) & 1
				let d = ((b>>ix) & 1)<<1
				//	four copies of  each pixel for the palettes
				NESToolState.image.setPixel(x + i, y + j, c + d)
				NESToolState.image.setPixel(x + i, 128+y + j, 4+c + d)
				NESToolState.image.setPixel(x + i, 256+y + j, 8+c + d)
				NESToolState.image.setPixel(x + i, 384+y + j, 12+c + d)
			}
		}
	}
	//	create tileset if the script doesn't have it
	var map = tiled.activeAsset;
	if (NESToolState.tileset==null)
	{
		tiled.log("new tileset")
    NESToolState.tileset = new Tileset('NES p0');
		NESToolState.tileset.setTileSize(8, 8);
    // Create a tileset from sprite image
    map.addTileset(NESToolState.tileset);
	}
	//	update
	tiled.log("update tileset")
	NESToolState.tileset.transparentColor = PALETTE[0]
	NESToolState.tileset.loadFromImage(NESToolState.image);
}

//	just load the binary file
function CHR_read(filename)
{
		var map = tiled.activeAsset;
		if(!map || !map.isTileMap) {
			tiled.alert("Make sure a Map document is active.")
			return;
		}
		let f = new BinaryFile(filename);
		if (f==null)
		{
			tiled.alert("failed.")
			return;
		}
	  let cart = f.readAll()
		if (NESToolState.bytes!=null)
			delete(NESToolState.bytes)

		NESToolState.bytes = new Uint8Array(cart)
		f.close();
		return map;
}

function PAL_read(filename)
{
	tiled.log("loading " + filename)
	let f = new BinaryFile(filename);
	if (f==null)
	{
		tiled.alert("failed.")
		return;
	}
	let cart = f.readAll()
	let pbytes = new Uint8Array(cart)
	f.close();
	for (let i=0;i<16;i++)
	{
		PALETTE[i] = NES_HW_PAL[pbytes[i]]
		cb0[i].color=PALETTE[i]
	}
}

//	dialog
NESToolState.NESDialog = tiled.registerAction("NESToolDialog", function(action) {
	if(NESToolState.dialogOpen) return;
	NESToolState.dialogOpen = true;
	let dialog = new Dialog("NES Tool");

	//	clear stored data
	NESToolState.image = null
	NESToolState.tileset = null
	NESToolState.bytes = null

	//	create the color buttons
	cb0 = [16]
	for (let i = 0; i < 16; ++i)
	{
		cb0[i] = dialog.addColorButton("")
		cb0[i].color = PALETTE[i]
		//	if we change
		cb0[i].colorChanged.connect(function() {
			//	once changed we convert to closed NES color value
			tiled.log("orig " + cb0[i].color.toString())
			PALETTE[i] = nearestColor(cb0[i].color.toString())
			tiled.log("nes " + PALETTE[i])
			// update button 
			cb0[i].color=PALETTE[i]
			//	repaint image
			CHR_repaint()
		});
		//	only 4 across		
		if ((i&3)==3) 
			dialog.addNewRow()
	}

	//	handle loading
	tiled.log("file button")
	let fname = dialog.addFilePicker("CHR ROM")
	fname.fileUrlChanged.connect(function() {
		var fileSchemeReplace = tiled.platform == "windows" ? "file:///" : "file://";
		var fileUrl = fname.fileUrl.toString().replace(fileSchemeReplace, "");
		CHR_read(fileUrl)
		//	not sure why but once doesn't always work
		CHR_repaint()
		CHR_repaint()
	});

	dialog.addNewRow()
	//	handle palette
	let pfname = dialog.addFilePicker("PALETTE")
	pfname.fileUrlChanged.connect(function() {
		var fileSchemeReplace = tiled.platform == "windows" ? "file:///" : "file://";
		var fileUrl = pfname.fileUrl.toString().replace(fileSchemeReplace, "");
		PAL_read(fileUrl)
		//	not sure why but once doesn't always work
		CHR_repaint()
		CHR_repaint()
	});

	dialog.addNewRow();
	let closeButton = dialog.addButton("Cancel");
	closeButton.clicked.connect(function() { dialog.done(Dialog.Rejected);} );
	dialog.finished.connect(function()
	{
		NESToolState.dialogOpen = false; 
	});
	dialog.show();
});
NESToolState.NESDialog.text = "NESToolDialog...";

tiled.extendMenu("Edit", [
    { action: "NESToolDialog", before: "Preferences" },
	{separator: true}
]);