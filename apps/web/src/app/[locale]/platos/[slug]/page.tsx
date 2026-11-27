import {
  DetailPage,
  detailMetadata,
  detailParams,
  type SlugProps,
} from '@/components/catalog/pages';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('platos');
}

export function generateMetadata(props: SlugProps) {
  return detailMetadata('platos', props);
}

export default function Page(props: SlugProps) {
  return <DetailPage category="platos" params={props.params} />;
}
