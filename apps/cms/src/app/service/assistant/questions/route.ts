import {suggestedQuestions} from '../../../../modules/assistant/faq';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{return Response.json({questions:await suggestedQuestions(new URL(req.url).searchParams.get('jurisdiction')||'')},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 catch{return Response.json({questions:[]},{status:503,headers:{'Cache-Control':'no-store'}});}
}
