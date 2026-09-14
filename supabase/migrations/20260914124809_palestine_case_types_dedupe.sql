-- أنواع عامة صار لها مقابل فلسطيني أدقّ، فبقاؤها يُربك الاختيار:
-- «أحوال شخصية» مقابل الشرعية والكنسية، و«إدارية» مقابل العدل العليا،
-- و«ضريبية» مقابل الضريبية والجمارك. تُخفى ولا تُحذف صونًا لأي ارتباط.
update public.case_types
set is_active = false
where name_ar in ('أحوال شخصية', 'إدارية', 'ضريبية')
  and not exists (select 1 from public.cases c where c.case_type_id = case_types.id);;
