.<?php

header("Content-Type: application/json");

echo json_encode([
    "server"=>"PHP",
    "status"=>"UP",
    "time"=>date("H:i:s")
]);