import {
  DetailPage,
  detailMetadata,
  detailParams,
  type SlugProps,
} from '@/components/catalog/pages';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('sitios');
}

export function generateMetadata(props: SlugProps) {
  return detailMetadata('sitios', props);
}

export default function Page(props: SlugProps) {
  return <DetailPage category="sitios" params={props.params} />;
}
