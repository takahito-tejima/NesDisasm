<?php

$db = sqlite_open("test.db", 0666);
if(!is_resource($db)) return false;

$query = sqlite_query($db, "select * from table1;");

$arr = array();

while($row = sqlite_fetch_object($query)){
  array_push($arr, $row);
}

echo json_encode($arr);

sqlite_close($db);

?>
