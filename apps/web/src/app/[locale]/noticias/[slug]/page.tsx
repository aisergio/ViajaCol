import {
  DetailPage,
  detailMetadata,
  detailParams,
  type SlugProps,
} from '@/components/catalog/pages';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('noticias');
}

export function generateMetadata(props: SlugProps) {
  return detailMetadata('noticias', props);
}

export default function Page(props: SlugProps) {
  return <DetailPage category="noticias" params={props.params} />;
}
