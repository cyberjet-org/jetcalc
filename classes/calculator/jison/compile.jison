round
|choose
|lt
|gt
|le
|ge
|min
|max
|limit			                              return 'U_FUNC';

monthInKvart								  return 'FUNC';

MCOUNT
|DCOUNT
|\{[A-Za-z]+\}
|_{2,3}[A-Za-z]+
|year                                          return 'CONSTANTA';


d_u_constanta                                  return 'U_CONSTANTA';


treetagin
|pathin
|periodin
|colin
|rowin
|rowgroupin
|rowsumgrpin
|objin
|grpin
|divin
|coltagin
|objtagin
|rowtagin
|groupin                                       return 'BOOLFUNC';

d_u_boolfunc                                   return 'U_BOOLFUNC';

iskorrperiod
|isplanperiod
|ismonth
|isozhidperiod
|issumperiod                                   return 'BOOLCONSTANTA';

d_u_boolconst                                  return 'U_BOOLCONSTANTA';



'forcol'
|'forobj'
|'fortype'
|'fordiv'
|'forperiod'                                   return 'SWITCH_FUNC';


'u_sw'                                         return 'U_SWITCH_FUNC';
