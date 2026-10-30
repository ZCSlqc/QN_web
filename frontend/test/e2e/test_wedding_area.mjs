import {test,expect} from '../fixtures/app.mjs';

test('area editor supports dragging, undo, local drafts, JSON export and mobile',async({page,app},testInfo)=>{
 app.admin=true;let saved;await page.route('**/__local/wedding-area',async route=>{saved=route.request().postDataJSON();await route.fulfill({json:{saved:true}});});await page.goto('/admin');await page.getByRole('link',{name:'可移动范围 →'}).click();
 await expect(page.locator('.area-validation')).toContainText('边界有效');
 const x=page.getByRole('spinbutton',{name:'点位 X'}),before=await x.inputValue();
 const node=page.locator('.area-node circle').first(),box=await node.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+5,box.y+box.height/2-5,{steps:3});await page.mouse.up();
 expect(await x.inputValue()).not.toBe(before);await page.getByRole('button',{name:'撤销',exact:true}).click();await expect(x).toHaveValue(before);
 const count=await page.locator('.area-node').count();await page.getByRole('button',{name:'边中点加点'}).click();await expect(page.locator('.area-node')).toHaveCount(count+1);
 await page.getByRole('button',{name:'保存到本机'}).click();await expect(page.locator('.area-message')).toContainText('frontend/src/features/wedding/walkable-area.json');expect(saved.points).toHaveLength(count+1);await page.reload();await expect(page.locator('.area-message')).toContainText('已恢复本机草稿');await expect(page.locator('.area-node')).toHaveCount(count+1);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出 JSON'}).click();const file=await download;expect(file.suggestedFilename()).toBe('walkable-area.json');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath('wedding-area-mobile.png'),fullPage:true});
});

test('import rejects crossing polygons without replacing geometry and routes around concave boundaries',async({page,app})=>{
 app.admin=true;await page.goto('/wedding/area');
 const result=await page.evaluate(async()=>{
  const {areaError,defaultArea,parseArea}=await import('/src/features/wedding/areaConfig.js'),{createNavigation}=await import('/src/features/wedding/navigation.js');
  const base={...defaultArea(),width:100,height:100,world:{width:100,height:100}},concave={...base,points:[[0,0],[100,0],[100,100],[60,100],[60,30],[40,30],[40,100],[0,100]]},a={x:20,y:80},b={x:80,y:80},nav=createNavigation(concave),path=nav.walkingRoute(a,b);
  const other=createNavigation({...base,points:[[0,0],[10,0],[10,10],[0,10]]});
  return {defaultError:areaError(defaultArea()),crossError:areaError({...base,points:[[0,0],[100,100],[0,100],[100,0]]}),pathLength:path.length,segments:path.every((p,i)=>nav.segmentWalkable(i?path[i-1]:a,p)),instancesIndependent:nav.isWalkable(b)&&!other.isWalkable(b),parsed:parseArea(JSON.stringify(concave)).points.length};
 });
 expect(result).toMatchObject({defaultError:'',pathLength:3,segments:true,instancesIndependent:true,parsed:8});expect(result.crossError).toContain('交叉');
 const count=await page.locator('.area-node').count();await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({width:100,height:100,world:{width:100,height:100},points:[[0,0],[100,100],[0,100],[100,0]]}))});
 await expect(page.locator('.area-message')).toContainText('导入失败');await expect(page.locator('.area-node')).toHaveCount(count);
});

test('area editor stays restricted to administrators and rip remains closed',async({page,app})=>{
 app.allowedPages=['/index','/wedding'];await page.goto('/wedding/area');await expect(page).toHaveURL(/\/index$/);await expect(page.locator('.area-page')).toHaveCount(0);
 await page.goto('/rip');await expect(page).toHaveURL(/\/index$/);
});
