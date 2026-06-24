const fs=require("fs");for(const line of fs.readFileSync(".env.local","utf8").split("\n")){const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].replace(/^"|"$/g,"");}
const {Pool}=require("pg");const pool=new Pool({host:process.env.PGHOST,port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,database:process.env.PGDATABASE,ssl:{rejectUnauthorized:false},max:1});
(async()=>{try{
const f=await pool.query("select max(data_publicacao_pncp) max_pub, now() agora, count(*) filter(where data_publicacao_pncp>=now()-interval '7 days') ult7, count(*) filter(where classified_at>=now()-interval '7 days') class7 from public.licitacoes_ti where e_ti");
console.log("FRESCOR:",JSON.stringify(f.rows[0]));
const pend=await pool.query("select count(*) n from public.licitacoes_ti where e_ti is null");
console.log("candidatos pendentes (e_ti null):",pend.rows[0].n);
const ab=await pool.query("select modalidade_nome, count(*) n, count(*) filter(where data_encerramento_proposta is null) semdata from public.licitacoes_ti where e_ti and data_publicacao_pncp>=now()-interval '20 days' group by 1 order by 2 desc");
console.log("ÚLTIMOS 20 DIAS por modalidade (n / sem data):"); ab.rows.forEach(r=>console.log("  ",r.modalidade_nome,":",r.n,"/ sem data",r.semdata));
try{const cr=await pool.query("select j.jobname, d.status, to_char(d.start_time,'MM-DD HH24:MI') t, left(coalesce(d.return_message,''),50) msg from cron.job_run_details d join cron.job j on j.jobid=d.jobid order by d.start_time desc limit 8");console.log("ÚLTIMAS EXECUÇÕES CRON:");cr.rows.forEach(r=>console.log("  ",r.t,r.jobname,r.status,r.msg));}catch(e){console.log("cron run details:",e.message);}
}catch(e){console.log("ERRO:",e.message);}finally{await pool.end();}})();
