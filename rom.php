<?php

$db = sqlite_open("nes.db", 0666);
if(!is_resource($db)) return false;

header("Pragma: no-cache");
header("Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0");

$exists = sqlite_single_query($db, "select * from sqlite_master where type='table' and name='rom'");
if($exists == null){
  sqlite_exec($db, "create table 'rom' ( 'id' integer primary key, ".
	      "'hash' vachar(255) not null, 'name' varchar , 'comment' varchar );");
}

$hash = "null";
if(isset( $_GET["hash"])) $hash = "'".$_GET["hash"]."'";

$id = sqlite_single_query($db, "select id from rom where hash=".$hash.";");
if($id == null){
  sqlite_exec($db, "insert into rom (hash) values (".$hash.");");
}

$query = sqlite_query($db, "select id, hash, name from rom where hash=".$hash.";", true);
$row = sqlite_fetch_object($query);

#$result = array('id'=>$id, 'name=>$name);

echo json_encode($row);

sqlite_close($db);

?>