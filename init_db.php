<!DOCTYPE html>
<html>

<?php


$db = sqlite_open("test.db");

sqlite_exec($db, "drop table table1;");
sqlite_exec($db, "create table table1 (address int, comment varchar(255));");

$address = 0x8017;
$comment = "いろいろスタート";
sqlite_exec($db, "insert into table1 (address, comment) values (".$address.", '".$comment."');");
$address = 0x800f;
$comment = "PPU初期化待ち";
sqlite_exec($db, "insert into table1 (address, comment) values (".$address.", '".$comment."');");

$query = sqlite_query($db, "select * from table1;");

while($row = sqlite_fetch_object($query)){
  print $row->address . $row->comment . "\n";
}


sqlite_close($db);



?>

</html>