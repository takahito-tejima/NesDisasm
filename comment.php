<?php

$rom = 0;
$csv = 0;
if(isset( $_GET["rom"])) $rom = $_GET["rom"];
if(isset( $_GET["csv"])) $csv = $_GET["csv"];
if($csv == 1){
  header("Content-type: text/plain; charset=utf-8");
}
header("Pragma: no-cache");
header("Cache-Control: no-store, no-cache, must-revalidate, post-check=0, pre-check=0");

$db = sqlite_open("nes.db", 0666);
if(!is_resource($db)) return false;

$exists = sqlite_single_query($db, "select * from sqlite_master where type='table' and name='comment'");
if($exists == null){
  sqlite_exec($db, "create table 'comment' ( 'rom' integer, 'address' integer, 'comment' varchar);");
}

$query = sqlite_query($db, "select * from comment where rom=".$rom." order by address;");

$arr = array();

while($row = sqlite_fetch_object($query)){
  array_push($arr, $row);
}

if($csv == 1){
  foreach($arr as $a){
    echo $a->address."\t".$a->comment;
    echo "\n";
  }
}else{
  echo json_encode($arr);
}

sqlite_close($db);

?>
