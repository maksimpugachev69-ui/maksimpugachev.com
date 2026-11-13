(function(){
var week=2,tab="sum";
function show(){
 document.querySelectorAll('.week').forEach(function(w){w.classList.toggle('on',+w.dataset.week===week)});
 document.querySelectorAll('.panel').forEach(function(p){p.hidden=p.dataset.tab!==tab});
 document.querySelectorAll('.wb').forEach(function(b){var on=+b.dataset.week===week;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
 document.querySelectorAll('.tb').forEach(function(b){b.classList.toggle('on',b.dataset.tab===tab)});
}
document.querySelectorAll('.wb').forEach(function(b){b.addEventListener('click',function(){week=+b.dataset.week;show()})});
document.querySelectorAll('.tb').forEach(function(b){b.addEventListener('click',function(){tab=b.dataset.tab;show()})});
show();
})();
