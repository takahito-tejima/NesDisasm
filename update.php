<?php

$rom = 0;
$address = 0;
$comment = "";

header("Pragma: no-cache");
header("Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0");

if(isset( $_GET["rom"])) $rom = $_GET["rom"];
if(isset( $_GET["addr"])) $address = $_GET["addr"];
if(isset( $_GET["comment"])) $comment = $_GET["comment"];

$db = sqlite_open("nes.db", 0666);
sqlite_exec($db, "delete from comment where rom=".$rom." and address=".$address.";");
if($comment != ""){
  $r = sqlite_exec($db, "insert into comment (rom, address, comment) values (".$rom.", ".$address.", '".$comment."');");
}

sqlite_close($db);

?>
