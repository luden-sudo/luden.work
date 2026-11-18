/** Safari can shrink either just the visual viewport or both viewport heights. */
export function keyboardIsOpen(layoutHeight:number,visibleHeight:number,referenceHeight:number,editing:boolean){
  return editing&&Math.max(layoutHeight,referenceHeight)-visibleHeight>150;
}
/** Scroll the field inside its sheet, rather than moving the page behind it. */
export function fieldScrollDelta(field:{top:number;bottom:number},safeTop:number,safeBottom:number){
  if(safeBottom<=safeTop)return 0;
  if(field.top<safeTop)return field.top-safeTop;
  if(field.bottom>safeBottom)return Math.min(field.top-safeTop,field.bottom-safeBottom);
  return 0;
}
