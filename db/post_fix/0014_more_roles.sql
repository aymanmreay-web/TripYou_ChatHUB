update hub.roles set title_ar = 'متدرب' where key = 'trainee';
update hub.roles set title_ar = 'مراقب جودة' where key = 'observer' and title_ar like '%مراقب%';
update hub.roles set title_ar = 'مراقب جودة' where key = 'observer';
