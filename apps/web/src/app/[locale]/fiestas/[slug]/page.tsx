import {
  DetailPage,
  detailMetadata,
  detailParams,
  type SlugProps,
} from '@/components/catalog/pages';

export const dynamicParams = false;

export function generateStaticParams() {
  return detailParams('fiestas');
}

export function generateMetadata(props: SlugProps) {
  return detailMetadata('fiestas', props);
}

export default function Page(props: SlugProps) {
  return <DetailPage category="fiestas" params={props.params} />;
}
