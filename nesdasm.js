/*
  nesdasm.js
  Copyright (C) 2011 Takahito TEJIMA
  tejima@da2.so-net.ne.jp
*/

Array.prototype.contains = function(value) {
	for(var i=0; i < this.length; i++) {
		if(this[i] === value) {
			return true;
		}
	}
	return false;
}

var mnemonic = [ 'brk', 'ora', '???', '???', '???', 'ora', 'asl', '???', 'php', 'ora', 'asl', '???', '???', 'ora', 'asl', '???',
                 'bpl', 'ora', '???', '???', '???', 'ora', 'asl', '???', 'clc', 'ora', '???', '???', '???', 'ora', 'asl', '???',
                 'jsr', 'and', '???', '???', 'bit', 'and', 'rol', '???', 'plp', 'and', 'rol', '???', 'bit', 'and', 'rol', '???',
                 'bmi', 'and', '???', '???', '???', 'and', 'rol', '???', 'sec', 'and', '???', '???', '???', 'and', 'rol', '???',
                 'rti', 'eor', '???', '???', '???', 'eor', 'lsr', '???', 'pha', 'eor', 'lsr', '???', 'jmp', 'eor', 'lsr', '???',
                 'bvc', 'eor', '???', '???', '???', 'eor', 'lsr', '???', 'cli', 'eor', '???', '???', '???', 'eor', 'lsr', '???',
                 'rts', 'adc', '???', '???', '???', 'adc', 'ror', '???', 'pla', 'adc', 'ror', '???', 'jmp', 'adc', 'ror', '???',
                 'bvs', 'adc', '???', '???', '???', 'adc', 'ror', '???', 'sei', 'adc', '???', '???', '???', 'adc', 'ror', '???',
                 '???', 'sta', '???', '???', 'sty', 'sta', 'stx', '???', 'dey', '???', 'txa', '???', 'sty', 'sta', 'stx', '???',
                 'bcc', 'sta', '???', '???', 'sty', 'sta', 'stx', '???', 'tya', 'sta', 'txs', '???', '???', 'sta', '???', '???',
                 'ldy', 'lda', 'ldx', '???', 'ldy', 'lda', 'ldx', '???', 'tay', 'lda', 'tax', '???', 'ldy', 'lda', 'ldx', '???',
                 'bcs', 'lda', '???', '???', 'ldy', 'lda', 'ldx', '???', 'clv', 'lda', 'tsx', '???', 'ldy', 'lda', 'ldx', '???',
                 'cpy', 'cmp', '???', '???', 'cpy', 'cmp', 'dec', '???', 'iny', 'cmp', 'dex', '???', 'cpy', 'cmp', 'dec', '???',
                 'bne', 'cmp', '???', '???', '???', 'cmp', 'dec', '???', 'cld', 'cmp', '???', '???', '???', 'cmp', 'dec', '???',
                 'cpx', 'sbc', '???', '???', 'cpx', 'sbc', 'inc', '???', 'inx', 'sbc', 'nop', '???', 'cpx', 'sbc', 'inc', '???',
                 'beq', 'sbc', '???', '???', '???', 'sbc', 'inc', '???', 'sed', 'sbc', '???', '???', '???', 'sbc', 'inc', '???' ];

var ppu_io = [ "PPU Control #1",
	       "PPU Control #2",
	       "PPU Status",
	       "PPU SPRITE RAM Address", 
	       "PPU SPRITE RAM Access",
	       "PPU SCROLL",
	       "PPU VRAM Address",
	       "PPU VRAM Access" ];

var apu_io = [ "pAPU Pulse #1 Control",
	       "pAPU Pulse #1 Ramp Control",
	       "pAPU Pulse #1 Fine Tune (FT)",
	       "pAPU Pulse #1 Coarse Tune (CT)",
	       "pAPU Pulse #2 Control",
	       "pAPU Pulse #2 Ramp Control",
	       "pAPU Pulse #2 Fine Tune (FT)",
	       "pAPU Pulse #2 Coarse Tune (CT)",
	       "pAPU Triangle Control",
	       "",
	       "pAPU Triangle Tune #1",
	       "pAPU Triangle Tune #2",
	       "pAPU Noise Control",
	       "",
	       "pAPU Noise Frequency #1",
	       "pAPU Noise Frequency #2",
	       "pAPU Delta Modulation Control",
	       "pAPU Delta Modulation D/A",
	       "pAPU Delta Modulation Address",
	       "pAPU Delta Modulation Size",
	       "Sprite DMA",
	       "pAPU Sound/Vertical Clock Signal Register",
	       "Joypad #1",
	       "Joypad #2/SOFTCLK" ];

var INST_NOACCESS = 0x0;
var INST_ENTRY = 0x1;
var INST_MARKED = 0x2;
var INST_INDIRECT = 0x4;
var INST_SUBROUTINE = 0x8;
var INST_IO_PPU = 0x10;
var INST_IO_APU = 0x20;
var INST_IO_SHIFT = 10;
var INST_IO_MASK = 0x1F;

var MEM_NONE = 0x0;
var MEM_INDIRECT_VECTOR = 0x1;

var nes;
var romid;
var comment;
var mapper;
var binary;
var code;

var outpage_entries = [];

function get(p)
{
    var v = binary.charCodeAt(p);
    code += hex(v);
    return v;
}
function getword(p)
{
    var abl = get(p++);
    var abh = get(p++);
    return (abh << 8)|abl;
}

function hex(n)
{
    return (n+0x100).toString(16).substr(-2);
}
function hexword(n)
{
//    return (n+0x10000).toString(16).substr(-4);
    return n.toString(16);
}

function isZeroPage(opcode)
{
    var low = (opcode & 15);
    if(low == 1 || low == 4 || low == 5 || low == 6){
	return true;
    }
    return false;
}
function isImmediate(opcode)
{
    var high = (opcode >> 4);
    var low = (opcode & 15);
    var hp = (high&1);
    
    if(opcode == 0xa0 || opcode == 0xc0 || opcode == 0xe0 ||
     low == 2 || (low == 9 && hp == 0)){
	return true;
    }
    return false;
}
function isAbsolute(opcode)
{
    var low = (opcode & 15);
    if(low == 9 || low == 0xd || low == 0xe){  // absolute
	return true;
    }
    return false;
}
function isJumpAbs(opcode)
{
    // JSR, JMP
    if(opcode == 0x20 || opcode == 0x4c || opcode == 0x6c /*indirect*/ ){
	return true;
    }
    return false;
}
function isJumpRel(opcode)
{
    var high = (opcode >> 4);
    var low = (opcode & 15);
    var hp = (high&1);
    
    if(low == 0 && hp ==1){
	return true;
    }
    return false;
}
function isReturn(opcode)
{
    // RTS, JMP, RTI
    if(opcode == 0x60 || opcode == 0x4c || opcode == 0x6c || opcode == 0x40){
	return true;
    }
    return false;
}

function mark(inst_mark, mem_mark, i, offset)
{
    //console.log("mark ", i);
    var start = i;
    var prev_addr = -1;
    while(i < inst_mark.length){
      inst_mark[i] |= INST_MARKED; // marked
      var opcode = get(i++);

      if(isZeroPage(opcode)){
  	inst_mark[i] |= INST_MARKED;
	var zp = get(i++);
	if((mem_mark[zp] & MEM_INDIRECT_VECTOR) > 0){
	    // this address would be used as jump vector
//            console.log("Detect jump vector ", hexword(prev_addr));
	    // TODO: code sanity check
	    for(var j = 0; j < 256; j+=2){
		var dst = getword(prev_addr+j-offset)-offset;
		if(dst < 0 || dst >= inst_mark.length) break;
		inst_mark[dst] |= INST_ENTRY;
		inst_mark[dst] |= INST_INDIRECT;
	    }
	    inst_mark[i] |= INST_ENTRY;
	}
      }else if(isImmediate(opcode)){
	inst_mark[i++] |= INST_MARKED;
      }else if(isAbsolute(opcode)){
	inst_mark[i] |= INST_MARKED;
	inst_mark[i+1] |= INST_MARKED;
	prev_addr = getword(i);
	if((prev_addr & 0xFFF8) == 0x2000){
	    inst_mark[i-1] |= INST_IO_PPU;
	    inst_mark[i-1] |= (prev_addr & 0x7) << INST_IO_SHIFT;
	}
	else if((prev_addr & 0xFFE0) == 0x4000){
	    inst_mark[i-1] |= INST_IO_APU;
	    inst_mark[i-1] |= (prev_addr & 0x1F) << INST_IO_SHIFT;
	}
	i+=2;
      }else if(isJumpAbs(opcode)){
    	inst_mark[i] |= INST_MARKED;
	inst_mark[i+1] |= INST_MARKED;
	var ab = getword(i); i+= 2;
	if(opcode == 0x6c){
	    // indirect jump
	    // usually, the indirect jump address will be stored in zero page. (or at least memory -$800))
	    if(ab < mem_mark.length){
		if((mem_mark[ab] & MEM_INDIRECT_VECTOR) == 0){
		    mem_mark[ab] |= MEM_INDIRECT_VECTOR; // used as indirect jump vector
		    i = start; // rewind and double-check
		    continue;
		}
	    }
	}else{
	    // absolute jump
	    if(ab-offset < inst_mark.length && (ab-offset) > 0) {  // sometimes jump destination will be antoher bank.
		inst_mark[ab-offset] |= INST_ENTRY;
		if(opcode == 0x20){ // JSR
		    inst_mark[ab-offset] |= INST_SUBROUTINE;
		}
	    }else if(offset == 0x8000){
		// other page
//		console.log("Jump to " + hexword(ab));
		outpage_entries.push(ab);
	    }
	}
      }else if(isJumpRel(opcode)){
    	inst_mark[i] |= INST_MARKED;
	var rel = get(i++);
	if(rel > 127) rel = rel-256;
	rel += i;
	inst_mark[rel] |= INST_ENTRY;
      }
    
      if(isReturn(opcode)){
	return i;
      }
    }
    return i;
}

function disasm(p, result, offset)
{
    code = "";
    var opcode = get(p++);
    var operand = "";

    if(isZeroPage(opcode)){
	var zp = get(p++);
	operand = "$" + hex(zp);
    }else if(isImmediate(opcode)){
	var im = get(p++);
	operand = "#$" + hex(im);
    }else if(isAbsolute(opcode)){
	var abl = get(p++);
	var abh = get(p++);
	var ab = (abh << 8)|abl;
	operand = "$" + hexword(ab);
    }else if(isJumpAbs(opcode)){
	var abl = get(p++);
	var abh = get(p++);
	var ab = (abh << 8)|abl;
	if(opcode != 0x6c){
  	  operand = "L" + hexword(ab);
	}else{
  	  operand = "($" + hexword(ab) +")";
	}
    }else if(isJumpRel(opcode)){
	var rel = get(p++);
	if(rel > 127) rel = rel-256;
	rel += p + offset;
	operand = "L" + hexword(rel);
    }

    var high = (opcode >> 4);
    var low = (opcode & 15);
    var hp = (high&1);

    if(low == 1 & hp == 0){
	operand = "(" + operand + ",x)";
    }else if(low == 1 && hp == 1){
	operand = "(" + operand + "),y";
    }else if(low == 4 && hp == 1){
	operand += ",x";
    }else if(low == 5 && hp == 1){
	operand += ",x";
    }else if(low == 6 && hp == 1){
	operand += ",x";
    }else if(low == 9 && hp == 1){
	operand += ",y";
    }else if(low == 0xc && hp == 1){
	operand += ",x";
    }else if(low == 0xd && hp == 1){
	operand += ",x";
    }else if(low == 0xe && hp == 1){
	if(opcode == 0xbe) operand += ",y";
	else operand += ",x";
    }

    result.opcode = code;
    result.asm = mnemonic[opcode];
    if(result.asm == undefined) result.asm = opcode;
    result.operand = operand;
    result.end = isReturn(opcode);
    
    return p;
}

function setComment(comment)
{
    var lines = comment.split("\n");
    for(var i = 0; i < lines.length; i++){
	var fields = lines[i].split("\t");
	if(fields.length < 2) break;
	console.log(i, fields[0], fields[1]);

	var addr = fields[0];
	var text = fields[1];

	$.get("update.php", { rom: romid, addr: addr, comment: text }, function(f){});
    }
    setNES(nes);
}

function setNES(bin)
{
    $("#asmtbl").empty();

    nes = bin;
    if(nes[0] != 'N' ||
       nes[1] != 'E' ||
       nes[2] != 'S'){
	alert("Invalid .nes file");
	return;
    }
    var prg_page = nes.charCodeAt(4);
    var chr_page = nes.charCodeAt(5);
    var cb1 = nes.charCodeAt(6);
    var cb2 = nes.charCodeAt(7);
    mapper = cb1>>4;
    
    $("#prg_page").text(prg_page);
    $("#chr_page").text(chr_page);
    $("#mapper").text(mapper);

    // calc hash and get info
    var hash = $.sha1(nes);
    $.getJSON("rom.php", {hash:hash, req:Math.random()}, function(json){
	romid = json.id;

	// get comment list from db
	$.getJSON("comment.php", {rom: romid, req:Math.random()}, function(json){
	    comment = new Object();
	    for(var j = 0; j < json.length; j++){
		var c = json[j];
		comment[c.address] = c.comment;
	    }
	    setBank(0);
	});

	$("#download").attr("href", "comment.php?rom="+romid+"&csv=1");
    });

    var code_size = 32*1024;
    binary = nes.substr(16, code_size);

    var p = 0x7ffa;
    int_nmi = getword(p); p += 2;
    int_reset = getword(p); p += 2;
    int_irq = getword(p); p += 2;

    if(int_nmi == 0) int_nmi = 0x8000;
    if(int_reset == 0) int_reset = 0x8000;
    if(int_irq == 0) int_irq = 0x8000;

    $("#int_nmi").get(0).value = hexword(int_nmi);
    $("#int_reset").get(0).value = hexword(int_reset);
    $("#int_irq").get(0).value = hexword(int_irq);


    for(var i = 0; i < 8; i++){
	var b = $("#bank"+i);
	if(i < prg_page){
	    b.removeAttr("disabled");
	    b.click = function(e){
		alert("A");
	    };
	}else{
	    b.attr("disabled", "disabled");
	}
    }

}

function setBank(bank)
{
    $("#loading").show();
    console.log("set bank ", bank);
    $("#asmtbl").empty();
    var offset = 0x8000;
    var code_size = 16*1024;
    var int_nmi = parseInt("0x"+$("#int_nmi").get(0).value);
    var int_reset = parseInt("0x"+$("#int_reset").get(0).value);
    var int_irq = parseInt("0x"+$("#int_irq").get(0).value);

//    if(mapper == 4){
	if(bank > 0){
	    binary = nes.substr(16 + code_size*bank, code_size);
	    offset = 0xc000;
	}else{
	    binary = nes.substr(16, code_size);
	    offset = 0x8000;
	}
//    }

    // first, mark all instruction address to disassemble
    var inst_mark = new Array(code_size);
    var mem_mark = new Array(0x800);
    for(var i = 0; i < code_size; i++){
	inst_mark[i] = INST_NOACCESS; // no-access
    }
    for(var i = 0; i < 0x800; i++){
	mem_mark[i] = MEM_NONE;
    }
    inst_mark[int_nmi-offset] = INST_ENTRY; // jump destination
    inst_mark[int_reset-offset] = INST_ENTRY; // jump destination
    inst_mark[int_irq-offset] = INST_ENTRY; // jump destination

    for(var i = 0; i < outpage_entries.length; i++){
	var addr = outpage_entries[i];
	if(addr >= offset && addr < offset+code_size){
	    inst_mark[addr-offset] = INST_ENTRY;
	}
    }
    
    // max 100 passes
    for(var j = 0; j < 100; j++){
	for(var i = 0; i < code_size;){
	    if(inst_mark[i] & INST_ENTRY){
		i = mark(inst_mark, mem_mark, i, offset);
	    }else{
		i++;
	    }
	}
	if(inst_mark.contains(1) == false) break;
    }

    // next, disassemble
    addLine(0, "", "", "org", "$" + hexword(offset), "");
    var r = new Object();
    r.asm = "";
    r.opcode = "";
    r.end = false;
    var db = [];
    for(var i = 0; i < code_size;){
	var addr = i;
	var m = inst_mark[i];
	if(m){
	    if(db.length > 0){
		flushDB(db);
	    }
	    i = disasm(i, r, offset);

	    if(addr == int_reset-offset){
		addComment("RESET ENTRY");
	    }
	    if(addr == int_nmi-offset){
		addComment("NMI ENTRY");
	    }
	    if(addr == int_irq-offset){
		addComment("IRQ ENTRY");
	    }

	    if((m & INST_INDIRECT) > 0){
		addComment("INDIRECT DESTINATION");
	    }
	    if((m & INST_SUBROUTINE) > 0){
		addComment("SUBROUTINE");
	    }

	    var label;
	    if((m & INST_ENTRY) > 0){
		label = "L" + hexword(addr+offset) + ":\t";
	    }else{
		label = "\t";
	    }


	    // comment
	    c = "";
	    if((m & INST_IO_PPU) > 0){
		var v = (m >> INST_IO_SHIFT) & INST_IO_MASK;
		c = ppu_io[v];
	    }else if((m & INST_IO_APU) > 0){
		var v = (m >> INST_IO_SHIFT) & INST_IO_MASK;
		c = apu_io[v];
	    }else{
		var c = comment[String(addr+offset)];
		if(c == undefined) c = "";
	    }

	    addLine(addr+offset, label, r.opcode, r.asm, r.operand, c);

	    if(r.end){
		addComment(" ");
	    }
	}else{
	    if(db.length == 0) db.addr = hexword(addr+offset);
	    db.push(get(i++));
	    if(db.length == 16) flushDB(db);
	}
    }
    if(db.length > 0){
	flushDB(db);
    }
    $("#loading").hide();
}

function addComment(comment)
{
    var row = $("<tr class='comment'/>");
    var cell =$("<td/>").text(comment);
    cell.attr("colSpan", 5);
    row.append(cell);

    $("#asmtbl").append(row);
}

// Begin edit comment
function editComment(e)
{
    var text = e.currentTarget.innerHTML;

    $(e.currentTarget).unbind("click");
    e.currentTarget.innerHTML = "";
    $("<input>", {
	type: "text",
	value: text,
	className: "comment",
	width: "100%",
	change: updateComment,
	focusout: updateComment
    }).appendTo(e.currentTarget).focus();
}

// End edit comment
function updateComment(e)
{
    var td = $(e.currentTarget).parent();
    var tr = td.parent();
    var text = e.currentTarget.value;
    var addr = parseInt(tr.attr("addr"));
    td.empty();
    td.text(text);
    td.bind("click", editComment);

    $.get("update.php", { rom: romid, addr: addr, comment: text }, function(f){});

//    console.log(hexword(addr), text);
}

// Add line to the result table
function addLine(address, label, code, asm, operand, comment)
{
    var row = $("<tr/>", {
	addr:address
    });
    row.append($("<td/>").text(label));
    row.append($("<td/>").text(code));
    row.append($("<td class='asm'/>").text(asm));
    row.append($("<td class='opr'/>").text(operand));

    var td = $("<td>", {
	text:comment
    });
    td.bind("click", editComment);
    row.append(td);

    $("#asmtbl").append(row);
}

function flushDB(db)
{
    var label = "L" + db.addr + ":";
    var data = "";
    var comment = "";
    for(var i = 0; i < db.length; i++)
    {
	data += hex(db[i]);
    }
    data += " ";
    for(var i = 0; i < db.length; i++)
    {
//	comment += String.fromCharCode(db[i]);
    }
    addLine(db.addr, label, "", "db", data, comment);
    db.length = 0;
}

function loadBinary(url)
{
    var req = new XMLHttpRequest();
    req.open('GET',url,true);
    req.overrideMimeType('text/plain; charset=x-user-defined');
    req.onreadystatechange = function(){
	if(req.readyState == 4){
	    if (req.status != 200) return '';
	    var bytes = "";
	    for (i = 0; i < req.responseText.length; i++)
		bytes += String.fromCharCode(req.responseText.charCodeAt(i) & 0xff);
	    
	    setNES(bytes);
	    $("#loading").hide();
	}
    };
    req.send(null);
}

$(function()
{
    $("#nesfile").change(function(e){
	$("#loading").show();
	var reader = new FileReader();
	reader.onload = function(re){
	    setNES(re.target.result);
	    $("#loading").hide();
	};
	$("#asmtbl").empty();
	
	var src = reader.readAsBinaryString(e.target.files[0]);
    });

    $("#commentfile").change(function(e){
	var reader = new FileReader();
	reader.onload = function(re){
	    setComment(re.target.result);
	};
	reader.readAsText(e.target.files[0]);
    });

    $("#bank0").click(function(){setBank(0)});
    $("#bank1").click(function(){setBank(1)});
    $("#bank2").click(function(){setBank(2)});
    $("#bank3").click(function(){setBank(3)});
    $("#bank4").click(function(){setBank(4)});
    $("#bank5").click(function(){setBank(5)});
    $("#bank6").click(function(){setBank(6)});
    $("#bank7").click(function(){setBank(7)});

    // default bin
    loadBinary("sample1.nes");
});

