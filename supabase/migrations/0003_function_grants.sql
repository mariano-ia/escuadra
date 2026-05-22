-- Escuadra — grants finos de funciones (cierra lint 0028 anon execute)
-- El grant por defecto es a PUBLIC; revocamos de public y concedemos solo a authenticated
-- (las policies RLS invocan is_studio_member/studio_role como authenticated).
revoke execute on function is_studio_member(uuid) from public;
revoke execute on function studio_role(uuid) from public;
revoke execute on function universal_search(uuid, text) from public;
grant execute on function is_studio_member(uuid) to authenticated;
grant execute on function studio_role(uuid) to authenticated;
grant execute on function universal_search(uuid, text) to authenticated;
