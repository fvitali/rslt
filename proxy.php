<?PHP 

$query = $_GET['q'] ;

$r = fetch($query) ;
if ($r['error'] == '') {
	foreach ($r['headers'] as $h) {
//		header($h) ;
	}
	$uri = $_SERVER["SERVER_NAME"] ;
	echo $r['data'] ;
} else {
	p($r) ;
}

/* ------------------------------ */
/*          UTILITIES             */
/* ------------------------------ */

function fetch($url,$cookie=NULL) {
	$ch=curl_init();
	if (isset($cookie)) {
		curl_setopt($ch, CURLOPT_COOKIE, "fv-proxy=$cookie");
	}
	curl_setopt($ch, CURLOPT_URL,$url);
	curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLINFO_HEADER_OUT, 1);
	curl_setopt($ch, CURLOPT_HEADER, 1); 
//	p($url) ;
	$data = curl_exec($ch);
	$return['url'] = $url ;	
	$return['error'] = curl_error($ch) ;
	$return['info']= curl_getinfo($ch) ;
	$header_size = curl_getinfo($ch,CURLINFO_HEADER_SIZE);
	$return['headers'] = explode("\r\n",substr($data, 0, $header_size));
	$return['data'] = substr( $data, $header_size );
	$return['httpcode'] = curl_getinfo($ch,CURLINFO_HTTP_CODE);
	curl_close($ch);
	return $return ;
}

function p($s) {
	echo ('<xmp>') ;
	print_r($s) ;
	echo ('</xmp>') ;
}

?>
